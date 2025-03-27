import { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/server-runtime";
import { useLoaderData } from "@remix-run/react";
import { useState, useMemo } from "react"; // Add this line
import { parse } from "csv-parse/sync";
import { promises as fs } from "fs";
import path from "path";
import { AreaChartSemiFilled, type DataPoint } from "~/components/chart";
import { GrowthRateChart } from "~/components/GrowthRateChart";


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
    const cumulativeData: Array<{date: string, value: number}> = [];
    
    sortedDates.forEach(dateStr => {
      cumulativeCount += usersByDate.get(dateStr) || 0;
      cumulativeData.push({
        date: dateStr,
        value: cumulativeCount
      });
    });
    
   // Calculate growth rate data (daily net new users)
   const growthRateData: Array<{date: string, value: number}> = [];
    
   sortedDates.forEach((dateStr, index) => {
     const dailyValue = usersByDate.get(dateStr) || 0;
     growthRateData.push({
       date: dateStr,
       value: dailyValue // Daily new users (not cumulative)
     });
   });
   
   return json({ 
     cumulativeData, 
     growthRateData,
     error: null 
   });
 } catch (e) {
   console.error("Error loading data:", e);
   return json({ 
     cumulativeData: [], 
     growthRateData: [],
     error: "Failed to load user data" 
   });
 }
}

export default function Index() {
  const { cumulativeData, growthRateData, error } = useLoaderData<{ 
    cumulativeData?: Array<{date: string, value: number}>, 
    growthRateData?: Array<{date: string, value: number}>, 
    error?: string 
  }>();
  const [timeFilter, setTimeFilter] = useState("all");
  
  // Process data for both charts
  const unfilteredCumulativeChartData = useMemo(() => {
    if (!cumulativeData) return [];
    
    return cumulativeData.map(point => ({
      date: new Date(point.date),
      value: point.value
    }));
  }, [cumulativeData]);
  
  const unfilteredGrowthRateChartData = useMemo(() => {
    if (!growthRateData) return [];
    
    return growthRateData.map(point => ({
      date: new Date(point.date),
      value: point.value
    }));
  }, [growthRateData]);
  
  // Time filter code for the cumulative chart (keep your existing implementation)
  const cumulativeChartData = useMemo(() => {
    if (!unfilteredCumulativeChartData.length) return [];
    
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
        return unfilteredCumulativeChartData;
    }
    
    // Filter to data points after cutoff date
    return unfilteredCumulativeChartData.filter(point => point.date >= cutoffDate);
  }, [unfilteredCumulativeChartData, timeFilter]);
  
  // Apply the same time filter logic to the growth rate chart
  const growthRateChartData = useMemo(() => {
    // Similar implementation to cumulativeChartData but for growth rate data
    if (!unfilteredGrowthRateChartData.length) return [];
    
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
        return unfilteredGrowthRateChartData;
    }
    
    // Filter to data points after cutoff date
    return unfilteredGrowthRateChartData.filter(point => point.date >= cutoffDate);
  }, [unfilteredGrowthRateChartData, timeFilter]);
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Telegram Growth</h1>
      
      {/* Time filter controls */}
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
      
      {/* Cumulative Growth Chart */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Cumulative Growth</h2>
        {cumulativeChartData.length > 0 ? (
          <AreaChartSemiFilled data={cumulativeChartData} />
        ) : (
          <p className="text-center py-10 text-gray-500">No data available for the selected period</p>
        )}
      </div>
      
      {/* Growth Rate Chart */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Daily Growth Rate</h2>
        {growthRateChartData.length > 0 ? (
          <GrowthRateChart data={growthRateChartData} />
        ) : (
          <p className="text-center py-10 text-gray-500">No data available for the selected period</p>
        )}
      </div>
    </div>
  );
}