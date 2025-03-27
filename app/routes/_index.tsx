import { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useState, useMemo } from "react"; // Add this line
import { parse } from "csv-parse/sync";
import { promises as fs } from "fs";
import path from "path";
import { AreaChartSemiFilled, type DataPoint } from "~/components/chart";

export const meta: MetaFunction = () => {
  return [
    { title: "Telegram  Dashboard" },
    { name: "description", content: "Tracking metrics of success" },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // Read the CSV file from the server
    const csvPath = path.join(process.cwd(), "data", "data.csv");
    const csvContent = await fs.readFile(csvPath, "utf-8");
    
    // Parse the CSV content with relaxed settings
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true, // Allow rows with fewer columns
      relax_quotes: true, // Be more forgiving with quotes
    });
    
    // Count users by subscription date
    const usersByDate = new Map<string, number>();
    
    records.forEach((record: any) => {
      const dateStr = record["subscribed at"] || record.date_joined;
      if (!dateStr) return;
      
      try {
        // Parse DD/MM/YYYY format manually
        const [datePart, timePart] = dateStr.split(' ');
        const [day, month, year] = datePart.split('/');
        
        // Create date with correct parts (months are 0-indexed in JS)
        const date = new Date(
          parseInt(year, 10),
          parseInt(month, 10) - 1,
          parseInt(day, 10)
        );
        
        if (isNaN(date.getTime())) {
          console.log("Invalid date:", dateStr);
          return;
        }
        
        const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
        usersByDate.set(dateKey, (usersByDate.get(dateKey) || 0) + 1);
      } catch (e) {
        console.error("Error parsing date:", dateStr, e);
      }
    });
    
    // Convert to cumulative data points for the chart
    const sortedDates = Array.from(usersByDate.keys()).sort();
    let cumulativeCount = 0;
    const data: Array<{date: string, value: number}> = [];
    
    sortedDates.forEach(dateStr => {
      cumulativeCount += usersByDate.get(dateStr) || 0;
      data.push({
        date: dateStr,
        value: cumulativeCount
      });
    });
    
    return new Response(JSON.stringify({ data }), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("CSV parsing error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}
export default function Index() {
  const { data, error } = useLoaderData<{ data?: Array<{date: string, value: number}>, error?: string }>();
  const [timeFilter, setTimeFilter] = useState("all"); // Add state for time filter
  
  if (error) {
    return (
      <div className="p-8 text-red-500">
        <h1 className="text-2xl font-bold mb-6">Error Loading Data</h1>
        <pre className="bg-red-50 p-4 rounded overflow-auto">{error}</pre>
      </div>
    );
  }
   // Convert string dates back to Date objects for the chart
   const unfilteredChartData: DataPoint[] = (data || []).map(d => ({
    date: new Date(d.date),
    value: d.value
  }));
  
  // Filter data based on selected time period
  const chartData = useMemo(() => {
    if (timeFilter === "all" || unfilteredChartData.length === 0) {
      return unfilteredChartData;
    }
    
    const now = new Date();
    const cutoffDate = new Date();
    
    switch (timeFilter) {
      case "7days":
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case "30days":
        cutoffDate.setDate(now.getDate() - 30);
        break;
      case "3months":
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      case "12months":
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return unfilteredChartData;
    }
    
    // Filter to data points after cutoff date
    const filteredData = unfilteredChartData.filter(point => point.date >= cutoffDate);
    
    // If there's no data in the selected period, return empty array
    if (filteredData.length === 0) {
      return filteredData;
    }
    
    // Adjust the first point to reflect the correct cumulative value at the start of the period
    if (filteredData[0] !== unfilteredChartData[0]) {
      // Find the last point before our filter starts
      const lastIndexBeforeCutoff = unfilteredChartData.findIndex(p => p.date >= cutoffDate) - 1;
      const previousValue = lastIndexBeforeCutoff >= 0 ? unfilteredChartData[lastIndexBeforeCutoff].value : 0;
      
      // Create adjusted data with the first point showing the cumulative value before this period
      return filteredData.map((point, i) => {
        if (i === 0) {
          return { ...point, previousValue }; // Store previous value for reference
        }
        return point;
      });
    }
    
    return filteredData;
  }, [unfilteredChartData, timeFilter]);
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Telegram Growth</h1>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
        <div className="flex justify-end mb-4">
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="all">All Time</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="3months">Last 3 Months</option>
            <option value="12months">Last 12 Months</option>
          </select>
        </div>
        
        {chartData.length > 0 ? (
          <AreaChartSemiFilled data={chartData} />
        ) : (
          <p className="text-center py-10 text-gray-500">No data available for the selected period</p>
        )}
      </div>
    </div>
  );
}