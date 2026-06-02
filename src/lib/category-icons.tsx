import { 
  Cloud, 
  Activity, 
  Cpu, 
  AlertCircle, 
  AlertTriangle, 
  Globe, 
  FileText,
  type LucideIcon 
} from "lucide-react";

export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  Climate: Cloud,
  Health: Activity,
  Technology: Cpu,
  Misinformation: AlertCircle,
  Fraud: AlertTriangle,
  Politics: Globe,
};

export function getCategoryIcon(category: string): LucideIcon {
  if (!category) return FileText;
  
  // Normalize category name: trim and capitalize first letter
  const normalized = category.trim();
  const capitalized = normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
  
  return CATEGORY_ICON_MAP[capitalized] || CATEGORY_ICON_MAP[normalized] || FileText;
}
