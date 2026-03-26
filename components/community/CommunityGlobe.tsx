"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import { Loader2, Globe, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CountryPopup } from "./CountryPopup";
import { JoinMapDialog } from "./JoinMapDialog";
import {
  useCommunityProfiles,
  useMyProfile,
  type CommunityProfile,
} from "@/hooks/useCommunityProfiles";
import { getCountryCentroid, countryByCode, numericToAlpha2 } from "@/lib/countries";
import { useWalletStore } from "@/store";

// Dynamic import for react-globe.gl (no SSR — needs WebGL)
const GlobeGL = dynamic(() => import("react-globe.gl"), {
  ssr: false,
  loading: () => null,
});

// TopoJSON bundled locally (~107KB, 110m resolution — lighter for low-end devices)
const TOPOJSON_URL = "/countries-110m.json";

interface MarkerData {
  lat: number;
  lng: number;
  countryCode: string;
  count: number;
  profiles: CommunityProfile[];
}

export function CommunityGlobe() {
  const globeRef = React.useRef<any>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const { isConnected } = useWalletStore();
  const { byCountry, total, mutate: mutateProfiles } = useCommunityProfiles();
  const { profile: myProfile, mutate: mutateMyProfile } = useMyProfile();

  // Mobile detection (disable heavy effects)
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // UI state
  const [geoData, setGeoData] = React.useState<any>(null);
  const [selectedCountry, setSelectedCountry] = React.useState<string | null>(null);
  const [hoveredCountry, setHoveredCountry] = React.useState<string | null>(null);
  const [showJoinDialog, setShowJoinDialog] = React.useState(false);
  const [globeReady, setGlobeReady] = React.useState(false);

  // Theme detection
  const [isDark, setIsDark] = React.useState(true);
  React.useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Transition phases
  const [phase, setPhase] = React.useState<"particles" | "transitioning" | "globe">("particles");

  // Load TopoJSON and convert to GeoJSON
  React.useEffect(() => {
    fetch(TOPOJSON_URL)
      .then((r) => r.json())
      .then((topo: Topology) => {
        const geo = feature(topo, topo.objects.countries) as any;
        // Inject ISO alpha-2 code into each feature's properties
        for (const feat of geo.features) {
          const numId = String(feat.id).padStart(3, "0");
          feat.properties = {
            ...feat.properties,
            ISO_A2: numericToAlpha2[numId] || "",
          };
        }
        setGeoData(geo);
      })
      .catch((err) => console.error("Failed to load globe data:", err));
  }, []);

  // Transition from particles to globe
  React.useEffect(() => {
    const t1 = setTimeout(() => setPhase("transitioning"), 800);
    const t2 = setTimeout(() => setPhase("globe"), 2200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // Auto-rotate configuration
  React.useEffect(() => {
    if (globeRef.current) {
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = 0.5;
      globeRef.current.controls().enableZoom = true;
      globeRef.current.controls().minDistance = 200;
      globeRef.current.controls().maxDistance = 600;

      // Point of view: slightly tilted
      globeRef.current.pointOfView({ lat: 20, lng: 10, altitude: 2.5 }, 0);
    }
  }, [globeReady]);

  // Build marker data from profiles grouped by country
  const markers: MarkerData[] = React.useMemo(() => {
    return Object.entries(byCountry)
      .map(([code, profiles]) => {
        const centroid = getCountryCentroid(code);
        if (!centroid) return null;
        return {
          lat: centroid.lat,
          lng: centroid.lng,
          countryCode: code,
          count: profiles.length,
          profiles,
        };
      })
      .filter(Boolean) as MarkerData[];
  }, [byCountry]);

  // Get country code from GeoJSON feature (ISO_A2 injected during TopoJSON conversion)
  const getFeatureCode = (feat: any): string => {
    return feat?.properties?.ISO_A2 || "";
  };

  // Country has profiles?
  const countryHasProfiles = (feat: any): boolean => {
    const code = getFeatureCode(feat);
    return !!byCountry[code]?.length;
  };

  // Handle country polygon click
  const handleCountryClick = (feat: any) => {
    const code = getFeatureCode(feat);
    if (byCountry[code]?.length) {
      setSelectedCountry(code);
      // Rotate globe to country
      const centroid = getCountryCentroid(code);
      if (centroid && globeRef.current) {
        globeRef.current.pointOfView(
          { lat: centroid.lat, lng: centroid.lng, altitude: 2 },
          1000
        );
      }
    }
  };

  // Handle join/edit
  const handleJoinSubmit = async (data: {
    displayName: string;
    countryCode: string;
    type: "USER" | "BUILDER" | "PROJECT";
    twitterHandle?: string;
    bio?: string;
    avatarUrl?: string;
  }) => {
    const method = myProfile ? "PUT" : "POST";
    const res = await fetch("/api/community/profile", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to save profile");
    }

    await mutateProfiles();
    await mutateMyProfile();
  };

  // Container dimensions
  const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 });

  React.useEffect(() => {
    function updateDimensions() {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    }
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  const selectedProfiles = selectedCountry ? byCountry[selectedCountry] || [] : [];

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {/* Globe */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ${
          phase === "particles" ? "opacity-0" : phase === "transitioning" ? "opacity-50" : "opacity-100"
        }`}
      >
        {geoData && dimensions.width > 0 && (
          <GlobeGL
            ref={globeRef}
            width={dimensions.width}
            height={dimensions.height}
            globeImageUrl={`data:image/svg+xml,${encodeURIComponent(
              `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect fill="${isDark ? '#0f172a' : '#cbd5e1'}" width="1" height="1"/></svg>`
            )}`}
            backgroundColor="rgba(0,0,0,0)"
            showAtmosphere={!isMobile}
            atmosphereColor={isDark ? "#2dd4bf" : "#0d9488"}
            atmosphereAltitude={0.15}
            // Country polygons
            polygonsData={geoData.features}
            polygonCapColor={(feat: any) => {
              const code = getFeatureCode(feat);
              if (isDark) {
                if (code === selectedCountry) return "rgba(45, 212, 191, 0.4)";
                if (code === hoveredCountry) return "rgba(45, 212, 191, 0.25)";
                if (countryHasProfiles(feat)) return "rgba(45, 212, 191, 0.15)";
                return "rgba(15, 23, 42, 0.75)";
              } else {
                if (code === selectedCountry) return "rgba(13, 148, 136, 0.5)";
                if (code === hoveredCountry) return "rgba(13, 148, 136, 0.3)";
                if (countryHasProfiles(feat)) return "rgba(13, 148, 136, 0.2)";
                return "rgba(226, 232, 240, 0.85)";
              }
            }}
            polygonSideColor={() => isDark ? "rgba(45, 212, 191, 0.08)" : "rgba(13, 148, 136, 0.1)"}
            polygonStrokeColor={() => isDark ? "rgba(45, 212, 191, 0.3)" : "rgba(13, 148, 136, 0.4)"}
            polygonAltitude={(feat: any) =>
              getFeatureCode(feat) === hoveredCountry ? 0.01 : 0.005
            }
            onPolygonClick={handleCountryClick}
            onPolygonHover={(feat: any) => {
              setHoveredCountry(feat ? getFeatureCode(feat) : null);
              if (containerRef.current) {
                containerRef.current.style.cursor = feat && countryHasProfiles(feat)
                  ? "pointer"
                  : "grab";
              }
            }}
            // HTML elements: profile avatars on the globe
            htmlElementsData={markers}
            htmlLat={(d: any) => d.lat}
            htmlLng={(d: any) => d.lng}
            htmlAltitude={0.03}
            htmlElement={(d: any) => {
              const el = document.createElement("div");
              el.style.cssText = "display:flex;align-items:center;gap:2px;cursor:pointer;transform:translate(-50%,-50%)";

              // Show up to 3 profile avatars + overflow count
              const shown = d.profiles.slice(0, 3);
              const overflow = d.count - shown.length;
              const size = d.count === 1 ? 32 : 26;

              shown.forEach((p: any, i: number) => {
                const img = document.createElement("div");
                img.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;border:2px solid ${isDark ? "#2dd4bf" : "#0d9488"};overflow:hidden;background:${isDark ? "#1e293b" : "#e2e8f0"};margin-left:${i > 0 ? "-8px" : "0"};position:relative;z-index:${3-i};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:${isDark ? "#2dd4bf" : "#0d9488"}`;
                if (p.avatarUrl) {
                  const avatar = document.createElement("img");
                  avatar.src = p.avatarUrl;
                  avatar.style.cssText = "width:100%;height:100%;object-fit:cover";
                  img.appendChild(avatar);
                } else {
                  img.textContent = p.displayName?.slice(0, 1)?.toUpperCase() || "?";
                }
                el.appendChild(img);
              });

              if (overflow > 0) {
                const badge = document.createElement("div");
                badge.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;border:2px solid ${isDark ? "#2dd4bf" : "#0d9488"};background:${isDark ? "#0f172a" : "#f1f5f9"};margin-left:-8px;position:relative;z-index:0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:${isDark ? "#2dd4bf" : "#0d9488"}`;
                badge.textContent = `+${overflow}`;
                el.appendChild(badge);
              }

              el.onclick = () => {
                const code = d.countryCode;
                if (byCountry[code]?.length) {
                  setSelectedCountry(code);
                  const centroid = getCountryCentroid(code);
                  if (centroid && globeRef.current) {
                    globeRef.current.pointOfView(
                      { lat: centroid.lat, lng: centroid.lng, altitude: 2 },
                      1000
                    );
                  }
                }
              };

              return el;
            }}
            onGlobeReady={() => setGlobeReady(true)}
          />
        )}
      </div>

      {/* Loading state */}
      {!geoData && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-brand" />
            <p className="text-sm text-text-secondary">Loading globe...</p>
          </div>
        </div>
      )}

      {/* Country popup (right panel) */}
      {selectedCountry && selectedProfiles.length > 0 && (
        <CountryPopup
          countryCode={selectedCountry}
          profiles={selectedProfiles}
          onClose={() => setSelectedCountry(null)}
        />
      )}

      {/* Bottom bar: stats + join button */}
      <div className="absolute bottom-4 left-4 right-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 z-10">
        <div className="px-3 py-2 rounded-lg bg-bg-card/80 backdrop-blur-lg border border-border text-center sm:text-left">
          <span className="text-xs sm:text-sm text-text-secondary">
            <span className="text-brand font-bold">{total}</span>{" "}
            member{total !== 1 ? "s" : ""} on HashWorld
          </span>
        </div>

        {isConnected ? (
          <div className="flex flex-col items-center sm:items-end gap-2">
            {myProfile && !myProfile.isApproved && (
              <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                <span className="text-xs text-amber-400">
                  ⏳ Your profile is under review. It will appear on the globe once approved.
                </span>
              </div>
            )}
            {myProfile ? (
              <Button
                variant="outline"
                onClick={() => setShowJoinDialog(true)}
                className="bg-bg-card/80 backdrop-blur-lg w-full sm:w-auto"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            ) : (
              <Button onClick={() => setShowJoinDialog(true)} className="w-full sm:w-auto py-3 sm:py-2">
                <Globe className="h-4 w-4 mr-2" />
                Join HashWorld
              </Button>
            )}
          </div>
        ) : (
          <div className="px-3 py-2 rounded-lg bg-bg-card/80 backdrop-blur-lg border border-border text-center">
            <span className="text-xs sm:text-sm text-text-secondary">
              Connect your wallet to join HashWorld
            </span>
          </div>
        )}
      </div>

      {/* Join/Edit dialog */}
      <JoinMapDialog
        isOpen={showJoinDialog}
        onClose={() => setShowJoinDialog(false)}
        onSubmit={handleJoinSubmit}
        onDelete={async () => {
          const res = await fetch("/api/community/profile", { method: "DELETE" });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Failed to delete profile");
          }
          await mutateProfiles();
          await mutateMyProfile();
        }}
        initialData={
          myProfile
            ? {
                displayName: myProfile.displayName,
                countryCode: myProfile.countryCode,
                type: (myProfile.type === "PERSON" ? "USER" : myProfile.type) as "USER" | "BUILDER" | "PROJECT",
                twitterHandle: myProfile.twitterHandle || undefined,
                bio: myProfile.bio || undefined,
                avatarUrl: myProfile.avatarUrl || undefined,
              }
            : undefined
        }
        isEdit={!!myProfile}
      />
    </div>
  );
}
