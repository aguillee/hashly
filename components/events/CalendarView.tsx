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
  X,
  MapPin,
  Globe,
  Users,
  Box,
  Clock,
  Infinity,
  ThumbsUp,
  Star,
  ExternalLink,
  Award,
} from "lucide-react";
import { HbarIcon } from "@/components/ui/HbarIcon";
import { UsdcIcon } from "@/components/ui/UsdcIcon";
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
  hasBadge?: boolean;
}

interface CalendarViewProps {
  events: Event[];
}

const EVENT_COLORS = {
  mint: { dot: "bg-teal-500", bar: "bg-teal-500/15 border-l-teal-500", badge: "bg-teal-500/15 text-teal-400", text: "text-teal-400" },
  forever: { dot: "bg-purple-500", bar: "bg-purple-500/15 border-l-purple-500", badge: "bg-purple-500/15 text-purple-400", text: "text-purple-400" },
  meetup: { dot: "bg-sky-500", bar: "bg-sky-500/15 border-l-sky-500", badge: "bg-sky-500/15 text-sky-400", text: "text-sky-400" },
  hackathon: { dot: "bg-amber-500", bar: "bg-amber-500/15 border-l-amber-500", badge: "bg-amber-500/15 text-amber-400", text: "text-amber-400" },
} as const;

function getEventStyle(event: Event) {
  if (event.isForeverMint) return EVENT_COLORS.forever;
  if (event.event_type === "ECOSYSTEM_MEETUP") return EVENT_COLORS.meetup;
  if (event.event_type === "HACKATHON") return EVENT_COLORS.hackathon;
  return EVENT_COLORS.mint;
}

function getEventTypeLabel(event: Event) {
  if (event.event_type === "ECOSYSTEM_MEETUP") return "Meetup";
  if (event.event_type === "HACKATHON") return "Hackathon";
  if (event.isForeverMint) return "Forever Mint";
  return "Mint";
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAYS_SHORT = ["M", "T", "W", "T", "F", "S", "S"];

export function CalendarView({ events }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [selectedDay, setSelectedDay] = React.useState<Date | null>(null);

  // Close on Escape
  React.useEffect(() => {
    if (!selectedDay) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedDay(null);
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [selectedDay]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Pre-compute events per day for the visible range (avoids filtering per cell)
  const eventsByDay = React.useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const day of days) {
      const key = day.toISOString().split("T")[0];
      const dayEvents = events.filter((event) => {
        const mintDate = new Date(event.mintDate);
        if (
          (event.event_type === "ECOSYSTEM_MEETUP" || event.event_type === "HACKATHON") &&
          event.endDate
        ) {
          return isWithinInterval(day, {
            start: startOfDay(mintDate),
            end: endOfDay(new Date(event.endDate)),
          });
        }
        return isSameDay(mintDate, day);
      });
      if (dayEvents.length > 0) map.set(key, dayEvents);
    }
    return map;
  }, [events, days]);

  const getEventsForDay = (day: Date) => {
    return eventsByDay.get(day.toISOString().split("T")[0]) || [];
  };

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];
  const weeks = Math.ceil(days.length / 7);

  return (
    <div className="relative">
      {/* Calendar Card */}
      <div className="bg-bg-card rounded-xl border border-border overflow-hidden">
        {/* Header — month nav */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight">
              {format(currentDate, "MMMM yyyy")}
            </h2>
            {/* Event count for this month */}
            {(() => {
              const monthEvents = events.filter((e) => {
                const d = new Date(e.mintDate);
                return d >= monthStart && d <= monthEnd;
              });
              return monthEvents.length > 0 ? (
                <span className="text-xs font-mono text-text-tertiary tabular-nums">
                  {monthEvents.length} events
                </span>
              ) : null;
            })()}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-2.5 py-1 rounded-md text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 px-4 sm:px-5 pb-3 text-[10px] sm:text-xs text-text-tertiary">
          {(["mint", "forever", "meetup", "hackathon"] as const).map((type) => (
            <span key={type} className="flex items-center gap-1.5">
              <span className={cn("w-2 h-2 rounded-full", EVENT_COLORS[type].dot)} />
              {type === "mint" ? "Mint" : type === "forever" ? "Forever" : type === "meetup" ? "Meetup" : "Hackathon"}
            </span>
          ))}
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-t border-border">
          {WEEKDAYS.map((day, i) => (
            <div
              key={day}
              className="py-2 text-center text-[10px] sm:text-xs font-medium text-text-tertiary uppercase tracking-wider"
            >
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{WEEKDAYS_SHORT[i]}</span>
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 border-t border-border">
          {days.map((day, index) => {
            const dayEvents = getEventsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isCurrentDay = isToday(day);
            const isSelected = selectedDay && isSameDay(day, selectedDay);
            const hasEvents = dayEvents.length > 0;

            return (
              <div
                key={day.toISOString()}
                onClick={() => {
                  if (hasEvents) setSelectedDay(isSelected ? null : day);
                }}
                className={cn(
                  "relative border-b border-r border-border transition-colors",
                  // Height: taller cells to give events room
                  weeks <= 5 ? "min-h-[72px] sm:min-h-[110px]" : "min-h-[60px] sm:min-h-[96px]",
                  // Remove right border on last column
                  index % 7 === 6 && "border-r-0",
                  // Dim non-current-month days
                  !isCurrentMonth && "bg-bg-secondary/30",
                  // Today highlight
                  isCurrentDay && "bg-brand/[0.04]",
                  // Selected highlight
                  isSelected && "bg-brand/[0.08] ring-1 ring-inset ring-brand/20",
                  // Interactive
                  hasEvents && "cursor-pointer hover:bg-bg-secondary/40"
                )}
              >
                {/* Day number */}
                <div className="px-1.5 pt-1 sm:px-2 sm:pt-1.5">
                  <span
                    className={cn(
                      "inline-flex items-center justify-center text-[11px] sm:text-sm font-medium",
                      !isCurrentMonth && "text-text-tertiary/40",
                      isCurrentMonth && !isCurrentDay && "text-text-secondary",
                      isCurrentDay &&
                        "w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-brand text-white text-[10px] sm:text-xs font-semibold"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                </div>

                {/* Events indicators */}
                {hasEvents && (
                  <div className="px-1 sm:px-1.5 pb-1 mt-0.5">
                    {/* Mobile: colored dots */}
                    <div className="sm:hidden flex items-center gap-0.5 flex-wrap px-0.5">
                      {dayEvents.slice(0, 5).map((event) => (
                        <span
                          key={event.id}
                          className={cn("w-1.5 h-1.5 rounded-full", getEventStyle(event).dot)}
                        />
                      ))}
                      {dayEvents.length > 5 && (
                        <span className="text-[7px] text-text-tertiary font-mono ml-0.5">
                          +{dayEvents.length - 5}
                        </span>
                      )}
                    </div>

                    {/* Desktop: colored event bars — show 2 titles max, then count */}
                    <div className="hidden sm:flex flex-col gap-[3px]">
                      {dayEvents.slice(0, 2).map((event) => {
                        const style = getEventStyle(event);
                        return (
                          <div
                            key={event.id}
                            className={cn(
                              "text-[10px] leading-tight pl-1.5 pr-1 py-[2px] rounded-[3px] truncate border-l-2",
                              style.bar
                            )}
                            title={event.title}
                          >
                            <span className="text-text-secondary font-medium flex items-center gap-0.5">
                              {event.hasBadge && <Award className="h-2.5 w-2.5 text-amber-400 flex-shrink-0" />}
                              <span className="truncate">{event.title}</span>
                            </span>
                          </div>
                        );
                      })}
                      {dayEvents.length > 2 && (
                        <div className="flex items-center gap-1 pl-1">
                          {dayEvents.slice(2, 5).map((event) => (
                            <span
                              key={event.id}
                              className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", getEventStyle(event).dot)}
                            />
                          ))}
                          <span className="text-[10px] text-text-tertiary font-mono">
                            +{dayEvents.length - 2}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Day Detail Panel — slides in from right on desktop, bottom sheet on mobile */}
      {selectedDay && selectedDayEvents.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-end bg-black/40 backdrop-blur-[2px]"
          onClick={() => setSelectedDay(null)}
        >
          <div
            className={cn(
              "bg-bg-card border-t sm:border-t-0 sm:border-l border-border shadow-2xl",
              "w-full sm:w-[420px] max-h-[85vh] sm:max-h-full sm:h-full",
              "rounded-t-2xl sm:rounded-none overflow-hidden",
              "animate-in slide-in-from-bottom sm:slide-in-from-right duration-200"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-tertiary mb-0.5">
                  {format(selectedDay, "EEEE")}
                </p>
                <h3 className="text-lg font-bold text-text-primary tracking-tight">
                  {format(selectedDay, "MMMM d, yyyy")}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-text-tertiary tabular-nums">
                  {selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? "s" : ""}
                </span>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="p-1.5 rounded-lg hover:bg-bg-secondary transition-colors text-text-tertiary hover:text-text-primary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Events list */}
            <div className="overflow-y-auto max-h-[calc(85vh-80px)] sm:max-h-[calc(100vh-80px)] p-4 space-y-3">
              {selectedDayEvents.map((event) => {
                const priceInfo = parseMintPrice(event.mintPrice);
                const isMeetup = event.event_type === "ECOSYSTEM_MEETUP";
                const isHackathon = event.event_type === "HACKATHON";
                const style = getEventStyle(event);

                return (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="block group"
                  >
                    <div className={cn(
                      "rounded-lg border border-border p-3 transition-all duration-150",
                      "hover:border-text-tertiary/30 hover:bg-bg-secondary/30"
                    )}>
                      <div className="flex gap-3">
                        {/* Image / placeholder */}
                        {event.imageUrl ? (
                          <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-bg-secondary ring-1 ring-border">
                            <img
                              src={event.imageUrl}
                              alt=""
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <div className={cn(
                            "w-14 h-14 rounded-lg flex-shrink-0 flex items-center justify-center",
                            "bg-bg-secondary ring-1 ring-border"
                          )}>
                            <span className={cn("text-lg font-bold", style.text)}>
                              {event.title[0]}
                            </span>
                          </div>
                        )}

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={cn(
                              "text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded",
                              style.badge
                            )}>
                              {getEventTypeLabel(event)}
                            </span>
                            {event.hasBadge && (
                              <span className="flex items-center gap-1 text-[9px] font-semibold text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded">
                                <Award className="h-2.5 w-2.5" />
                                BADGE
                              </span>
                            )}
                            {event.status === "LIVE" && (
                              <span className="flex items-center gap-1 text-[9px] font-semibold text-green-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                LIVE
                              </span>
                            )}
                          </div>
                          <h4 className="font-semibold text-sm text-text-primary truncate group-hover:text-brand transition-colors">
                            {event.title}
                          </h4>

                          {/* Meta row */}
                          <div className="flex items-center gap-2.5 mt-1.5 text-[11px] text-text-tertiary">
                            {(isMeetup || isHackathon) ? (
                              <>
                                {event.host && (
                                  <span className="flex items-center gap-1 truncate max-w-[120px]">
                                    <Users className="h-3 w-3 flex-shrink-0" />
                                    {event.host}
                                  </span>
                                )}
                                {event.location_type === "IN_PERSON" && event.location ? (
                                  <span className="flex items-center gap-1 truncate max-w-[100px]">
                                    <MapPin className="h-3 w-3 flex-shrink-0" />
                                    {event.location}
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
                                    {format(new Date(event.mintDate), "MMM d")}–{format(new Date(event.endDate), "d")}
                                  </span>
                                )}
                                <span className="flex items-center gap-1 text-yellow-500">
                                  <Star className="h-3 w-3 fill-yellow-500" />
                                  {event.votesUp}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="flex items-center gap-1 font-medium text-text-secondary">
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
                                    Always
                                  </span>
                                )}
                                {(() => {
                                  const score = getVoteScore(event.votesUp, event.votesDown);
                                  return (
                                    <span className={cn(
                                      "flex items-center gap-1 font-medium",
                                      score > 0 ? "text-green-500" : score < 0 ? "text-red-500" : "text-text-tertiary"
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

                        {/* Arrow indicator */}
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <ExternalLink className="h-3.5 w-3.5 text-text-tertiary" />
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
