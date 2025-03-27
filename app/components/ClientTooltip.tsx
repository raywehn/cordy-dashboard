"use client";
import * as React from "react";
import { createPortal } from "react-dom";

/* -------------------------------------------------------------------------------------------------
 * This is a basic tooltip created for the chart demos. Customize as needed or bring your own solution.
 * -----------------------------------------------------------------------------------------------*/

type TooltipContextValue = {
  tooltip: { x: number; y: number } | undefined;
  setTooltip: (tooltip: { x: number; y: number } | undefined) => void;
};

const TooltipContext = React.createContext<TooltipContextValue | undefined>(undefined);

function useTooltipContext(componentName: string): TooltipContextValue {
  const context = React.useContext(TooltipContext);
  if (!context) {
    throw new Error("Tooltip must be used within a Tooltip Context");
  }
  return context;
}

/* -------------------------------------------------------------------------------------------------
 * Tooltip
 * -----------------------------------------------------------------------------------------------*/

const Tooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tooltip, setTooltip] = React.useState<{ x: number; y: number }>();

  return (
    <TooltipContext.Provider value={{ tooltip, setTooltip }}>{children}</TooltipContext.Provider>
  );
};

/* -------------------------------------------------------------------------------------------------
 * TooltipTrigger
 * -----------------------------------------------------------------------------------------------*/

const TRIGGER_NAME = "TooltipTrigger";

const TooltipTrigger = React.forwardRef<SVGGElement, { children: React.ReactNode }>(
  (props, forwardedRef) => {
    const { children } = props;
    const context = useTooltipContext(TRIGGER_NAME);

    const handleMouseMove = React.useCallback(
      (event: React.MouseEvent) => {
        // Get position relative to the page
        const x = event.clientX;
        const y = event.clientY;
        context.setTooltip({ x, y });
      },
      [context]
    );

    const handleMouseLeave = React.useCallback(() => {
      context.setTooltip(undefined);
    }, [context]);

    return (
      <g
        ref={forwardedRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={(e) => {
          // For mobile, show the tooltip on touch
          if (e.touches?.[0]) {
            context.setTooltip({ x: e.touches[0].clientX, y: e.touches[0].clientY });
          }
        }}
        style={{ cursor: "pointer" }}
      >
        {children}
      </g>
    );
  }
);

TooltipTrigger.displayName = TRIGGER_NAME;

/* -------------------------------------------------------------------------------------------------
 * TooltipContent
 * -----------------------------------------------------------------------------------------------*/

const CONTENT_NAME = "TooltipContent";

const TooltipContent = React.forwardRef<HTMLDivElement, { children: React.ReactNode }>(
  (props, forwardedRef) => {
    const { children } = props;
    const context = useTooltipContext(CONTENT_NAME);
    const tooltipRef = React.useRef<HTMLDivElement>(null);
    const runningOnClient = typeof window !== "undefined";

    const getTooltipPosition = () => {
        if (!context.tooltip) {
          return {
            top: 0,
            left: 0,
          };
        }
      
        if (!tooltipRef.current) {
          return {
            top: context.tooltip.y,
            left: context.tooltip.x + 10,
          };
        }
      
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const tooltipWidth = tooltipRect.width;
        const windowWidth = window.innerWidth;
        const willOverflowRight = context.tooltip.x + tooltipWidth + 10 > windowWidth;
      
        return {
          top: context.tooltip.y - 20,
          left: willOverflowRight ? context.tooltip.x - tooltipWidth - 10 : context.tooltip.x + 10,
        };
      };
      
      // Also update this part
      if (!context.tooltip || !runningOnClient) {
        return null;
      }

    const isMobile = window.innerWidth < 768;

    return createPortal(
      isMobile ? (
        <div
          className="fixed h-fit z-60 w-fit rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3"
          style={{
            top: context.tooltip.y,
            left: context.tooltip.x + 20,
          }}
        >
          {children}
        </div>
      ) : (
        <div
          ref={tooltipRef}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3.5 py-2 rounded-sm fixed z-50"
          style={getTooltipPosition()}
        >
          {children}
        </div>
      ),
      document.body
    );
  }
);

TooltipContent.displayName = CONTENT_NAME;

/* -------------------------------------------------------------------------------------------------
 * Exports
 * -----------------------------------------------------------------------------------------------*/

export { Tooltip as ClientTooltip, TooltipTrigger, TooltipContent };