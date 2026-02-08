"use client";

import * as React from "react";
import Link from "next/link";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
} from "date-fns";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface Event {
  id: string;
  title: string;
  mintDate: string;
  status: string;
  imageUrl: string | null;
}

interface CalendarViewProps {
  events: Event[];
}

export function CalendarView({ events }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = React.useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDay = (day: Date) => {
    return events.filter((event) => isSameDay(new Date(event.mintDate), day));
  };

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weekDaysShort = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <div className="bg-bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-2.5 sm:p-4 border-b border-border">
        <h2 className="text-base sm:text-xl font-bold">
          {format(currentDate, "MMM yyyy")}
        </h2>
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="p-1.5 sm:p-2"
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs sm:text-sm px-2 sm:px-3"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="p-1.5 sm:p-2"
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Week Days Header */}
      <div className="grid grid-cols-7 border-b border-border">
        {weekDays.map((day, i) => (
          <div
            key={day}
            className="p-1.5 sm:p-3 text-center text-[10px] sm:text-sm font-medium text-text-secondary"
          >
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{weekDaysShort[i]}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isCurrentDay = isToday(day);
          const maxEventsToShow = typeof window !== 'undefined' && window.innerWidth < 640 ? 1 : 3;

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-[60px] sm:min-h-[100px] p-1 sm:p-2 border-b border-r border-border",
                index % 7 === 6 && "border-r-0",
                !isCurrentMonth && "bg-bg-secondary/50",
                isCurrentDay && "bg-accent-primary/5"
              )}
            >
              <div
                className={cn(
                  "text-[10px] sm:text-sm font-medium mb-0.5 sm:mb-1",
                  !isCurrentMonth && "text-text-secondary/50",
                  isCurrentDay &&
                    "w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-accent-primary text-white flex items-center justify-center text-[10px] sm:text-sm"
                )}
              >
                {format(day, "d")}
              </div>

              <div className="space-y-0.5 sm:space-y-1">
                {/* Mobile: show dots for events */}
                <div className="sm:hidden">
                  {dayEvents.length > 0 && (
                    <Link
                      href={`/events/${dayEvents[0].id}`}
                      className={cn(
                        "block text-[8px] leading-tight p-0.5 rounded truncate transition-colors",
                        dayEvents[0].status === "LIVE"
                          ? "bg-success/20 text-success"
                          : "bg-accent-primary/20 text-accent-primary"
                      )}
                    >
                      {dayEvents[0].title.slice(0, 8)}...
                    </Link>
                  )}
                  {dayEvents.length > 1 && (
                    <span className="text-[8px] text-text-secondary">
                      +{dayEvents.length - 1}
                    </span>
                  )}
                </div>

                {/* Desktop: show event titles */}
                <div className="hidden sm:block space-y-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <Link
                      key={event.id}
                      href={`/events/${event.id}`}
                      className={cn(
                        "block text-xs p-1 rounded truncate transition-colors",
                        event.status === "LIVE"
                          ? "bg-success/20 text-success hover:bg-success/30"
                          : "bg-accent-primary/20 text-accent-primary hover:bg-accent-primary/30"
                      )}
                    >
                      {event.title}
                    </Link>
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-xs text-text-secondary">
                      +{dayEvents.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
