import { useCallback, useEffect, useRef, useState } from "react";
import debounce from "lodash.debounce";

export function useProfilePanel({ location, navigate, setBounds }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileWidthMode, setProfileWidthMode] = useState("normal");
  const [mapBbox, setMapBbox] = useState(null);
  const profileTriggerRef = useRef(null);

  const updateMapBbox = useRef(
    debounce((bounds) => {
      if (!bounds) return;
      setMapBbox([
        bounds.west,
        bounds.south,
        bounds.east,
        bounds.north,
      ]);
    }, 400),
  ).current;

  useEffect(() => {
    return () => updateMapBbox.cancel();
  }, [updateMapBbox]);

  const handleBoundsChange = useCallback(
    (nextBounds) => {
      setBounds((previous) => {
        if (
          previous &&
          previous.north === nextBounds.north &&
          previous.south === nextBounds.south &&
          previous.east === nextBounds.east &&
          previous.west === nextBounds.west
        ) {
          return previous;
        }

        updateMapBbox(nextBounds);
        return nextBounds;
      });
    },
    [setBounds, updateMapBbox],
  );

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setIsProfileOpen(params.get("panel") === "profile");
  }, [location.search]);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setIsProfileOpen(params.get("panel") === "profile");
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const openProfilePanel = (triggerRef) => {
    if (triggerRef?.current) profileTriggerRef.current = triggerRef.current;

    const params = new URLSearchParams(location.search);
    if (params.get("panel") !== "profile") {
      params.set("panel", "profile");
      navigate(
        { pathname: location.pathname, search: `?${params.toString()}` },
        { replace: false },
      );
    }
    setIsProfileOpen(true);
  };

  const closeProfilePanel = () => {
    const params = new URLSearchParams(location.search);
    if (params.get("panel") === "profile") {
      params.delete("panel");
      const search = params.toString();
      navigate(
        {
          pathname: location.pathname,
          search: search ? `?${search}` : "",
        },
        { replace: true },
      );
    }
    setIsProfileOpen(false);
  };

  return {
    isProfileOpen,
    profileWidthMode,
    setProfileWidthMode,
    mapBbox,
    profileTriggerRef,
    handleBoundsChange,
    openProfilePanel,
    closeProfilePanel,
  };
}
