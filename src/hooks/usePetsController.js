import { useCallback, useEffect, useState } from "react";
import { localApi } from "../localClient";

export function usePetsController(initialFilters = {}) {
  const [pets, setPets] = useState([]);
  const [filters, setFilters] = useState({
    status: "available",
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

  const loadPets = useCallback(async () => {
    if (!bounds) return;

    setLoading(true);
    setError("");

    let query = localApi.from("pets").select("*");

    if (filters.status === "available") {
      query = query.in("status", [
        "available",
        "Lost",
        "Found",
        "Abandoned",
        "delivered",
      ]);
    }
    if (filters.category && filters.category !== "all") {
      query = query.eq("category", filters.category);
    }
    if (filters.animal && filters.animal !== "all") {
      query = query.eq("animal", filters.animal);
    }
    if (filters.ward && filters.ward !== "all") {
      query = query.eq("district", filters.ward);
    }

    query = query
      .gte("lat", bounds.south)
      .lte("lat", bounds.north)
      .gte("lng", bounds.west)
      .lte("lng", bounds.east);

    const { data, error: loadError } = await query;

    if (loadError) {
      console.error("Lỗi load pets theo bounds:", loadError);
      setError(loadError.message || "Không thể tải dữ liệu mèo.");
      setPets([]);
      setLoading(false);
      return;
    }

    let nextPets = data || [];
    if (filters.searchName?.trim()) {
      const searchTerm = filters.searchName.toLowerCase().trim();
      nextPets = nextPets.filter((pet) => {
        const name = (pet.name || "").toLowerCase();
        const description = (pet.description || "").toLowerCase();
        return name.includes(searchTerm) || description.includes(searchTerm);
      });
    }

    setPets(nextPets);
    if (
      selectedPetId &&
      !nextPets.some((pet) => (pet.id || pet.pet_id) === selectedPetId)
    ) {
      setSelectedPetId(null);
    }
    setLoading(false);
  }, [bounds, filters, selectedPetId]);

  useEffect(() => {
    loadPets();
  }, [loadPets]);

  useEffect(() => {
    const loadPetFull = async () => {
      if (!selectedPetId) {
        setSelectedPetFull(null);
        return;
      }

      const pet = pets.find(
        (item) => (item.id || item.pet_id) === selectedPetId,
      );
      if (!pet) {
        setSelectedPetFull(null);
        return;
      }

      try {
        const { data, error: detailError } = await localApi
          .from("pets")
          .select("*")
          .eq("id", selectedPetId)
          .single();

        if (!detailError && data) setSelectedPetFull(data);
      } catch (detailError) {
        console.error("Error loading full pet:", detailError);
      }
    };

    loadPetFull();
  }, [pets, selectedPetId]);

  const selectedPet =
    selectedPetFull ||
    pets.find((pet) => (pet.id || pet.pet_id) === selectedPetId) ||
    null;

  const deleteSelectedPet = async () => {
    if (!selectedPet || !confirm("Bạn có chắc muốn XÓA bài đăng này?")) {
      return;
    }

    try {
      const { error: deleteError } = await localApi
        .from("pets")
        .delete()
        .eq("id", selectedPet.id);

      if (deleteError) throw deleteError;
      await loadPets();
      setSelectedPetId(null);
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
