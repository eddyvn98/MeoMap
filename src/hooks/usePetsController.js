import { useCallback, useEffect, useRef, useState } from "react";
import { localApi } from "../localClient";
import { CLOSED_STATUSES, OPEN_STATUSES } from "../utils/petStatus";

const DISTRICT_ALIASES = {
  q1: ["q1", "Quận 1", "District 1"],
  q2: ["q2", "Quận 2", "District 2"],
  q3: ["q3", "Quận 3", "District 3"],
  q4: ["q4", "Quận 4", "District 4"],
  q5: ["q5", "Quận 5", "District 5"],
  q6: ["q6", "Quận 6", "District 6"],
  q7: ["q7", "Quận 7", "District 7"],
  q8: ["q8", "Quận 8", "District 8"],
  q9: ["q9", "Quận 9", "District 9"],
  q10: ["q10", "Quận 10", "District 10"],
  q11: ["q11", "Quận 11", "District 11"],
  q12: ["q12", "Quận 12", "District 12"],
  qbn: ["qbn", "Bình Chánh", "Huyện Bình Chánh", "Quận Bình Nhật"],
  qbt: ["qbt", "Quận Bình Tân", "Bình Tân"],
  qbth: ["qbth", "Quận Bình Thạnh", "Bình Thạnh"],
  qgg: ["qgg", "Quận Gò Vấp", "Gò Vấp"],
  qtb: ["qtb", "Quận Tân Bình", "Tân Bình"],
  qtp: ["qtp", "Quận Tân Phú", "Tân Phú"],
  qth: ["qth", "Thủ Đức", "TP Thủ Đức", "Thành phố Thủ Đức"],
};

export function usePetsController(initialFilters = {}) {
  const [pets, setPets] = useState([]);
  const [filters, setFilters] = useState({
    status: "open",
    category: initialFilters.category || "all",
    color: initialFilters.color || "all",
    animal: initialFilters.animal || "all",
    ward: initialFilters.ward || "all",
  });
  const [bounds, setBounds] = useState(null);
  const [selectedPetId, setSelectedPetId] = useState(null);
  const [selectedPetFull, setSelectedPetFull] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestVersion = useRef(0);

  const loadPets = useCallback(async () => {
    if (!bounds) return;

    const version = ++requestVersion.current;
    setLoading(true);
    setError("");

    let query = localApi.from("pets").select("*");

    if (filters.status === "available" || filters.status === "open") {
      query = query.in("status", OPEN_STATUSES);
    } else if (filters.status === "closed") {
      query = query.in("status", CLOSED_STATUSES);
    } else if (filters.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }

    if (filters.category && filters.category !== "all") {
      query = query.eq("category", filters.category);
    }
    if (filters.animal && filters.animal !== "all") {
      query = query.eq("animal", filters.animal);
    }
    if (filters.color && filters.color !== "all") {
      query = query.eq("color", filters.color);
    }
    if (filters.ward && filters.ward !== "all") {
      const aliases = DISTRICT_ALIASES[filters.ward] || [filters.ward];
      query = query.in("district", aliases);
    }

    query = query
      .gte("lat", bounds.south)
      .lte("lat", bounds.north)
      .gte("lng", bounds.west)
      .lte("lng", bounds.east);

    const { data, error: loadError } = await query;
    if (version !== requestVersion.current) return;

    if (loadError) {
      console.error("Lỗi load pets theo bounds:", loadError);
      setError(loadError.message || "Không thể tải dữ liệu thú cưng.");
      setPets([]);
      setLoading(false);
      return;
    }

    let nextPets = data || [];
    if (filters.searchName?.trim()) {
      const searchTerm = filters.searchName.toLowerCase().trim();
      nextPets = nextPets.filter((pet) => {
        const name = String(pet.name || "").toLowerCase();
        const description = String(pet.description || "").toLowerCase();
        return name.includes(searchTerm) || description.includes(searchTerm);
      });
    }

    setPets(nextPets);
    setSelectedPetId((current) => {
      if (!current) return current;
      return nextPets.some((pet) => (pet.id || pet.pet_id) === current)
        ? current
        : null;
    });
    setLoading(false);
  }, [bounds, filters]);

  useEffect(() => {
    loadPets();
  }, [loadPets]);

  useEffect(() => {
    let active = true;
    setSelectedPetFull(null);

    const loadPetFull = async () => {
      if (!selectedPetId) return;
      if (!pets.some((item) => (item.id || item.pet_id) === selectedPetId)) {
        return;
      }

      const { data, error: detailError } = await localApi
        .from("pets")
        .select("*")
        .eq("id", selectedPetId)
        .maybeSingle();

      if (!active) return;
      if (detailError) {
        console.error("Error loading full pet:", detailError);
        return;
      }
      setSelectedPetFull(data || null);
    };

    loadPetFull();
    return () => {
      active = false;
    };
  }, [pets, selectedPetId]);

  const selectedPet =
    selectedPetFull ||
    pets.find((pet) => (pet.id || pet.pet_id) === selectedPetId) ||
    null;

  const deleteSelectedPet = async () => {
    if (!selectedPet || !confirm("Bạn có chắc muốn XÓA bài đăng này?")) return;

    try {
      const { error: deleteError } = await localApi
        .from("pets")
        .delete()
        .eq("id", selectedPet.id);

      if (deleteError) throw deleteError;
      setSelectedPetId(null);
      setSelectedPetFull(null);
      await loadPets();
      alert("Đã xóa bài đăng.");
    } catch (deleteError) {
      console.error(deleteError);
      alert("Lỗi: " + deleteError.message);
    }
  };

  return {
    pets,
    filters,
    setFilters,
    bounds,
    setBounds,
    selectedPetId,
    setSelectedPetId,
    selectedPet,
    loading,
    error,
    loadPets,
    deleteSelectedPet,
  };
}
