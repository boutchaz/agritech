import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { CropTemplate } from '@/types/agricultural-accounting';

export function useCropTemplates() {
  return useQuery({
    queryKey: ['crop-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crop_templates')
        .select('*')
        .order('crop_name');
      if (error) throw error;
      return data as CropTemplate[];
    },
    staleTime: 10 * 60 * 1000,
  });
}
