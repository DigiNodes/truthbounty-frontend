import { getCategoryIcon, CATEGORY_ICON_MAP } from '../category-icons';
import { 
  Cloud, 
  Activity, 
  Cpu, 
  AlertCircle, 
  AlertTriangle, 
  Globe, 
  FileText 
} from "lucide-react";

describe('category-icons utility', () => {
  it('should return correct icons for known categories', () => {
    expect(getCategoryIcon('Climate')).toBe(Cloud);
    expect(getCategoryIcon('climate')).toBe(Cloud);
    expect(getCategoryIcon(' CLIMATE ')).toBe(Cloud);
    expect(getCategoryIcon('Health')).toBe(Activity);
    expect(getCategoryIcon('Technology')).toBe(Cpu);
    expect(getCategoryIcon('Misinformation')).toBe(AlertCircle);
    expect(getCategoryIcon('Fraud')).toBe(AlertTriangle);
    expect(getCategoryIcon('Politics')).toBe(Globe);
  });

  it('should return FileText for unknown categories', () => {
    expect(getCategoryIcon('Unknown')).toBe(FileText);
    expect(getCategoryIcon('')).toBe(FileText);
  });

  it('should have all categories in CATEGORY_ICON_MAP mapped correctly', () => {
    expect(CATEGORY_ICON_MAP['Climate']).toBe(Cloud);
    expect(CATEGORY_ICON_MAP['Health']).toBe(Activity);
    expect(CATEGORY_ICON_MAP['Technology']).toBe(Cpu);
    expect(CATEGORY_ICON_MAP['Misinformation']).toBe(AlertCircle);
    expect(CATEGORY_ICON_MAP['Fraud']).toBe(AlertTriangle);
    expect(CATEGORY_ICON_MAP['Politics']).toBe(Globe);
  });
});
