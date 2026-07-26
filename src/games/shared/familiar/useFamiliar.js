import { useContext } from "react";
import { FamiliarContext } from "./FamiliarProvider";

export function useFamiliar() {
  const context = useContext(FamiliarContext);
  if (!context) throw new Error("useFamiliar must be used within FamiliarProvider.");
  return context;
}
