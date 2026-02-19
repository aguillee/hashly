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
  isWithinInterval,
  startOfDay,
  endOfDay,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  X,
  MapPin,
  Globe,
  Users,
  Box,
  Clock,
  Infinity,
  ThumbsUp,
  Star,
} from "lucide-react";
import { HbarIcon } from "@/components/ui/HbarIcon";
import { UsdcIcon } from "@/components/ui/UsdcIcon";
import { Button } from "@/components/ui/Button";
import { cn, parseMintPrice, getVoteScore } from "@/lib/utils";

interface Event {
  id: string;
  title: string;
  description: string;
  mintDate: string;
  endDate?: string | null;
  mintPrice: string;
  supply: number | null;
  imageUrl: string | null;
  status: "UPCOMING" | "LIVE";
  votesUp: number;
  votesDown: number;
  isForeverMint?: boolean;
  event_type?: "MINT_EVENT" | "ECOSYSTEM_MEETUP" | "HACKATHON";
  host?: string | null;
  location?: string | null;
  location_type?: string | null;
}

interface CalendarViewProps {
  events: Event[];
}

export function CalendarView({ events }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [selectedDay, setSelectedDay] = React.useState<Date | null>(null);

  // Close modal on Escape
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedDay(null);
    };
    if (selectedDay) {
      document.addEventListener("keydown", handleEsc);
      return () => document.removeEventListener("keydown", handleEsc);
    }
  }, [selectedDay]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // For meetups with endDate, show event on every day it spans
  const getEventsForDay = (day: Date) => {
    return events.filter((event) => {
      const mintDate = new Date(event.mintDate);

      // Meetups: if they have an endDate, show on all days in range
      if (
        (event.event_type === "ECOSYSTEM_MEETUP" || event.event_type === "HACKATHON") &&
        event.endDate
      ) {
        const end = new Date(event.endDate);
        return isWithinInterval(day, {
          start: startOfDay(mintDate),
          end: endOfDay(end),
        });
      }

      // All other events: show on mintDate only
      return isSameDay(mintDate, day);
    });
  };

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  const getEventColor = (event: Event) => {
    if (event.isForeverMint) return "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30";
    if (event.event_type === "ECOSYSTEM_MEETUP") return "bg-sky-500/20 text-sky-400 hover:bg-sky-500/30";
    if (event.event_type === "HACKATHON") return "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30";
    return "bg-teal-500/20 text-teal-400 hover:bg-teal-500/30";
  };

  const getEventDot = (event: Event) => {
    if (event.isForeverMint) return "bg-purple-500";
    if (event.event_type === "ECOSYSTEM_MEETUP") return "bg-sky-500";
    if (event.event_type === "HACKATHON") return "bg-amber-500";
    return "bg-accent-primary";
  };

  const getEventTypeLabel = (event: Event) => {
    if (event.event_type === "ECOSYSTEM_MEETUP") return "Meetup";
    if (event.event_type === "HACKATHON") return "Hackathon";
    if (event.isForeverMint) return "Forever Mint";
    return "Mint Event";
  };

  const getEventTypeBadgeColor = (event: Event) => {
    if (event.event_type === "ECOSYSTEM_MEETUP") return "bg-sky-500/20 text-sky-400";
    if (event.event_type === "HACKATHON") return "bg-amber-500/20 text-amber-400";
    if (event.isForeverMint) return "bg-purple-500/20 text-purple-400";
    return "bg-teal-500/20 text-teal-400";
  };

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weekDaysShort = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <div className="relative">
      <div className="bg-bg-card/80 rounded-lg border border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-2.5 sm:p-4 border-b border-border">
          <h2 className="text-base sm:text-xl font-bold">
            {format(currentDate, "MMMM yyyy")}
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

        {/* Legend */}
        <div className="flex items-center gap-3 px-3 sm:px-4 py-1.5 sm:py-2 border-b border-border/50 text-[10px] sm:text-xs text-text-secondary">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent-primary" /> Mint Event</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" /> Forever Mint</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-500" /> Meetup</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Hackathon</span>
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
            const isSelected = selectedDay && isSameDay(day, selectedDay);

            return (
              <div
                key={day.toISOString()}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (dayEvents.length > 0) {
                    setSelectedDay(isSelected ? null : day);
                  }
                }}
                className={cn(
                  "min-h-[60px] sm:min-h-[100px] p-1 sm:p-2 border-b border-r border-border transition-colors",
                  index % 7 === 6 && "border-r-0",
                  !isCurrentMonth && "bg-bg-secondary/50",
                  isCurrentDay && "bg-accent-primary/5",
                  isSelected && "bg-accent-primary/10 ring-1 ring-accent-primary/40",
                  dayEvents.length > 0 && "cursor-pointer hover:bg-bg-secondary/30"
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
                  {/* Mobile: show colored dots + count */}
                  <div className="sm:hidden">
                    {dayEvents.length > 0 && (
                      <div className="flex items-center gap-0.5 flex-wrap">
                        {dayEvents.slice(0, 4).map((event) => (
                          <span
                            key={event.id}
                            className={cn("w-1.5 h-1.5 rounded-full", getEventDot(event))}
                          />
                        ))}
                        {dayEvents.length > 4 && (
                          <span className="text-[7px] text-text-secondary ml-0.5">
                            +{dayEvents.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Desktop: show event titles */}
                  <div className="hidden sm:block space-y-0.5">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        className={cn(
                          "block text-[11px] leading-tight px-1 py-0.5 rounded truncate transition-colors",
                          getEventColor(event)
                        )}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[11px] text-text-secondary hover:text-accent-primary transition-colors">
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

      {/* Day Detail Modal */}
      {selectedDay && selectedDayEvents.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedDay(null)}>
          <div
            className="bg-bg-card border border-border rounded-lg shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h3 className="font-bold text-lg text-text-primary">
                  {format(selectedDay, "EEEE, MMMM d")}
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  {selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? "s" : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setSelectedDay(null); }}
                className="p-1.5 rounded-md hover:bg-bg-secondary transition-colors text-text-secondary hover:text-text-primary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Events List */}
            <div className="overflow-y-auto max-h-[calc(80vh-80px)] p-3 space-y-2">
              {selectedDayEvents.map((event) => {
                const priceInfo = parseMintPrice(event.mintPrice);
                const isMeetup = event.event_type === "ECOSYSTEM_MEETUP";
                const isHackathon = event.event_type === "HACKATHON";

                return (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className={cn(
                      "block p-3 rounded-md border border-border/50 hover:border-border hover:bg-bg-secondary/30 transition-all group border-l-4",
                      event.isForeverMint
                        ? "border-l-purple-500"
                        : event.event_type === "ECOSYSTEM_MEETUP"
                        ? "border-l-sky-500"
                        : event.event_type === "HACKATHON"
                        ? "border-l-amber-500"
                        : "border-l-accent-primary"
                    )}
                  >
                    <div className="flex gap-3">
                      {/* Image */}
                      {event.imageUrl ? (
                        <div className="w-16 h-16 rounded overflow-hidden flex-shrink-0 bg-bg-secondary">
                          <img
                            src={event.imageUrl}
                            alt={event.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded flex-shrink-0 bg-bg-secondary flex items-center justify-center">
                          <Calendar className="h-6 w-6 text-text-secondary/30" />
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn(
                            "text-[10px] font-semibold px-1.5 py-0.5 rounded",
                            getEventTypeBadgeColor(event)
                          )}>
                            {getEventTypeLabel(event)}
                          </span>
                        </div>
                        <h4 className="font-semibold text-sm text-text-primary truncate group-hover:text-accent-primary transition-colors">
                          {event.title}
                        </h4>

                        {/* Meta info */}
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-text-secondary">
                          {(isMeetup || isHackathon) ? (
                            <>
                              {event.host && (
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  <span className="truncate max-w-[120px]">{event.host}</span>
                                </span>
                              )}
                              {event.location_type === "IN_PERSON" && event.location ? (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  <span className="truncate max-w-[100px]">{event.location}</span>
                                </span>
                              ) : event.location_type === "ONLINE" ? (
                                <span className="flex items-center gap-1">
                                  <Globe className="h-3 w-3" />
                                  Online
                                </span>
                              ) : null}
                              {event.endDate && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(event.mintDate), "MMM d")} - {format(new Date(event.endDate), "MMM d")}
                                </span>
                              )}
                              <span className="flex items-center gap-1 text-yellow-500">
                                <Star className="h-3 w-3 fill-yellow-500" />
                                {event.votesUp}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="flex items-center gap-1 font-medium">
                                {priceInfo.isHbar ? (
                                  <HbarIcon className="h-3 w-3" />
                                ) : (
                                  <UsdcIcon className="h-3 w-3" />
                                )}
                                {priceInfo.value}
                              </span>
                              {event.supply && (
                                <span className="flex items-center gap-1">
                                  <Box className="h-3 w-3" />
                                  {event.supply.toLocaleString()}
                                </span>
                              )}
                              {event.isForeverMint && (
                                <span className="flex items-center gap-1 text-purple-400">
                                  <Infinity className="h-3 w-3" />
                                  Always Live
                                </span>
                              )}
                              {(() => {
                                const score = getVoteScore(event.votesUp, event.votesDown);
                                return (
                                  <span className={cn(
                                    "flex items-center gap-1 font-medium",
                                    score > 0 ? "text-green-500" : score < 0 ? "text-red-500" : "text-text-secondary"
                                  )}>
                                    <ThumbsUp className="h-3 w-3" />
                                    {score > 0 ? `+${score}` : score}
                                  </span>
                                );
                              })()}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
