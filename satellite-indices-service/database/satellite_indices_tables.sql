-- Satellite Indices Service Database Tables
-- This migration adds tables for satellite indices processing and data storage

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Satellite Processing Jobs table
CREATE TABLE public.satellite_processing_jobs (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE,
    parcel_id uuid REFERENCES public.parcels(id) ON DELETE CASCADE,
    job_type text NOT NULL DEFAULT 'batch_processing' CHECK (job_type IN ('batch_processing', 'single_parcel', 'cloud_check')),
    indices text[] NOT NULL, -- Array of vegetation indices to calculate
    date_range_start date NOT NULL,
    date_range_end date NOT NULL,
    cloud_coverage_threshold numeric(5,2) DEFAULT 10.0 CHECK (cloud_coverage_threshold >= 0 AND cloud_coverage_threshold <= 100),
    scale integer DEFAULT 10 CHECK (scale >= 10 AND scale <= 1000),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    progress_percentage numeric(5,2) DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    total_tasks integer DEFAULT 0,
    completed_tasks integer DEFAULT 0,
    failed_tasks integer DEFAULT 0,
    error_message text,
    results_summary jsonb,
    created_at timestamptz DEFAULT now() NOT NULL,
    started_at timestamptz,
    completed_at timestamptz,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Satellite Indices Data table
CREATE TABLE public.satellite_indices_data (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE,
    parcel_id uuid NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
    processing_job_id uuid REFERENCES public.satellite_processing_jobs(id) ON DELETE SET NULL,
    date date NOT NULL,
    index_name text NOT NULL CHECK (index_name IN ('NDVI', 'NDRE', 'NDMI', 'MNDWI', 'GCI', 'SAVI', 'OSAVI', 'MSAVI2', 'PRI', 'MSI', 'MCARI', 'TCARI')),
    mean_value numeric(10,6),
    min_value numeric(10,6),
    max_value numeric(10,6),
    std_value numeric(10,6),
    median_value numeric(10,6),
    percentile_25 numeric(10,6),
    percentile_75 numeric(10,6),
    percentile_90 numeric(10,6),
    pixel_count integer,
    cloud_coverage_percentage numeric(5,2),
    image_source text DEFAULT 'Sentinel-2',
    geotiff_url text, -- URL to download the GeoTIFF file
    geotiff_expires_at timestamptz, -- When the GeoTIFF URL expires
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(parcel_id, date, index_name) -- Prevent duplicate data for same parcel/date/index
);

-- AOI (Area of Interest) table for satellite processing
CREATE TABLE public.satellite_aois (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE,
    parcel_id uuid REFERENCES public.parcels(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    geometry geometry(Polygon, 4326), -- PostGIS geometry for spatial queries
    geometry_json jsonb, -- GeoJSON representation for API responses
    area_hectares numeric(10,4),
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Cloud Coverage Check Results table
CREATE TABLE public.cloud_coverage_checks (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE,
    parcel_id uuid NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
    aoi_id uuid REFERENCES public.satellite_aois(id) ON DELETE SET NULL,
    check_date date NOT NULL,
    date_range_start date NOT NULL,
    date_range_end date NOT NULL,
    max_cloud_threshold numeric(5,2) NOT NULL,
    has_suitable_images boolean NOT NULL,
    available_images_count integer DEFAULT 0,
    suitable_images_count integer DEFAULT 0,
    min_cloud_coverage numeric(5,2),
    max_cloud_coverage numeric(5,2),
    avg_cloud_coverage numeric(5,2),
    recommended_date date,
    all_cloud_percentages numeric(5,2)[],
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Processing Task Queue table for background processing
CREATE TABLE public.satellite_processing_tasks (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    processing_job_id uuid NOT NULL REFERENCES public.satellite_processing_jobs(id) ON DELETE CASCADE,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE,
    parcel_id uuid NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
    aoi_id uuid REFERENCES public.satellite_aois(id) ON DELETE SET NULL,
    task_type text NOT NULL DEFAULT 'calculate_indices' CHECK (task_type IN ('calculate_indices', 'export_geotiff', 'cloud_check')),
    indices text[] NOT NULL,
    date_range_start date NOT NULL,
    date_range_end date NOT NULL,
    cloud_coverage_threshold numeric(5,2) DEFAULT 10.0,
    scale integer DEFAULT 10,
    priority integer DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'retrying')),
    attempts integer DEFAULT 0,
    max_attempts integer DEFAULT 3,
    error_message text,
    result_data jsonb,
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_satellite_processing_jobs_org ON public.satellite_processing_jobs(organization_id);
CREATE INDEX idx_satellite_processing_jobs_farm ON public.satellite_processing_jobs(farm_id);
CREATE INDEX idx_satellite_processing_jobs_parcel ON public.satellite_processing_jobs(parcel_id);
CREATE INDEX idx_satellite_processing_jobs_status ON public.satellite_processing_jobs(status);
CREATE INDEX idx_satellite_processing_jobs_created ON public.satellite_processing_jobs(created_at);

CREATE INDEX idx_satellite_indices_data_org ON public.satellite_indices_data(organization_id);
CREATE INDEX idx_satellite_indices_data_farm ON public.satellite_indices_data(farm_id);
CREATE INDEX idx_satellite_indices_data_parcel ON public.satellite_indices_data(parcel_id);
CREATE INDEX idx_satellite_indices_data_date ON public.satellite_indices_data(date);
CREATE INDEX idx_satellite_indices_data_index ON public.satellite_indices_data(index_name);
CREATE INDEX idx_satellite_indices_data_parcel_date ON public.satellite_indices_data(parcel_id, date);
CREATE INDEX idx_satellite_indices_data_parcel_index ON public.satellite_indices_data(parcel_id, index_name);

CREATE INDEX idx_satellite_aois_org ON public.satellite_aois(organization_id);
CREATE INDEX idx_satellite_aois_farm ON public.satellite_aois(farm_id);
CREATE INDEX idx_satellite_aois_parcel ON public.satellite_aois(parcel_id);

CREATE INDEX idx_cloud_coverage_checks_org ON public.cloud_coverage_checks(organization_id);
CREATE INDEX idx_cloud_coverage_checks_parcel ON public.cloud_coverage_checks(parcel_id);
CREATE INDEX idx_cloud_coverage_checks_date ON public.cloud_coverage_checks(check_date);

CREATE INDEX idx_satellite_processing_tasks_job ON public.satellite_processing_tasks(processing_job_id);
CREATE INDEX idx_satellite_processing_tasks_org ON public.satellite_processing_tasks(organization_id);
CREATE INDEX idx_satellite_processing_tasks_parcel ON public.satellite_processing_tasks(parcel_id);
CREATE INDEX idx_satellite_processing_tasks_status ON public.satellite_processing_tasks(status);
CREATE INDEX idx_satellite_processing_tasks_priority ON public.satellite_processing_tasks(priority DESC, created_at ASC);

-- Enable Row Level Security
ALTER TABLE public.satellite_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.satellite_indices_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.satellite_aois ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_coverage_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.satellite_processing_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for satellite_processing_jobs
CREATE POLICY "Organization members can manage processing jobs" ON public.satellite_processing_jobs
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- RLS Policies for satellite_indices_data
CREATE POLICY "Organization members can view satellite data" ON public.satellite_indices_data
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Service can insert satellite data" ON public.satellite_indices_data
    FOR INSERT WITH CHECK (true); -- Allow service to insert data

CREATE POLICY "Service can update satellite data" ON public.satellite_indices_data
    FOR UPDATE USING (true); -- Allow service to update data

-- RLS Policies for satellite_aois
CREATE POLICY "Organization members can manage AOIs" ON public.satellite_aois
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- RLS Policies for cloud_coverage_checks
CREATE POLICY "Organization members can view cloud checks" ON public.cloud_coverage_checks
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Service can insert cloud checks" ON public.cloud_coverage_checks
    FOR INSERT WITH CHECK (true);

-- RLS Policies for satellite_processing_tasks
CREATE POLICY "Organization members can view processing tasks" ON public.satellite_processing_tasks
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id
            FROM public.organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Service can manage processing tasks" ON public.satellite_processing_tasks
    FOR ALL USING (true);

-- Create triggers for updated_at timestamps
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.satellite_processing_jobs FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.satellite_indices_data FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.satellite_aois FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.cloud_coverage_checks FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.satellite_processing_tasks FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Helper functions for satellite indices processing

-- Function to get parcels with their geometry for satellite processing
CREATE OR REPLACE FUNCTION public.get_parcels_for_satellite_processing(org_uuid uuid)
RETURNS TABLE(
    parcel_id uuid,
    parcel_name text,
    farm_id uuid,
    farm_name text,
    organization_id uuid,
    boundary jsonb,
    area_hectares numeric,
    soil_type text,
    irrigation_type text,
    notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id as parcel_id,
        p.name as parcel_name,
        f.id as farm_id,
        f.name as farm_name,
        f.organization_id,
        p.boundary,
        COALESCE(p.area, 0) as area_hectares,
        p.soil_type,
        p.irrigation_type,
        p.description as notes
    FROM public.parcels p
    JOIN public.farms f ON p.farm_id = f.id
    WHERE f.organization_id = org_uuid 
        AND p.boundary IS NOT NULL -- Only parcels with defined boundaries
    ORDER BY f.name, p.name;
END;
$$;

-- Function to get latest satellite data for a parcel
CREATE OR REPLACE FUNCTION public.get_latest_satellite_data(parcel_uuid uuid, index_name_param text DEFAULT NULL)
RETURNS TABLE(
    index_name text,
    date date,
    mean_value numeric,
    min_value numeric,
    max_value numeric,
    std_value numeric,
    median_value numeric,
    cloud_coverage_percentage numeric,
    geotiff_url text,
    created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        sid.index_name,
        sid.date,
        sid.mean_value,
        sid.min_value,
        sid.max_value,
        sid.std_value,
        sid.median_value,
        sid.cloud_coverage_percentage,
        sid.geotiff_url,
        sid.created_at
    FROM public.satellite_indices_data sid
    WHERE sid.parcel_id = parcel_uuid
        AND (index_name_param IS NULL OR sid.index_name = index_name_param)
    ORDER BY sid.date DESC, sid.created_at DESC;
END;
$$;

-- Function to get satellite data statistics for date range
CREATE OR REPLACE FUNCTION public.get_satellite_data_statistics(
    parcel_uuid uuid,
    index_name_param text,
    start_date_param date,
    end_date_param date
)
RETURNS TABLE(
    index_name text,
    data_points_count bigint,
    mean_value numeric,
    min_value numeric,
    max_value numeric,
    std_value numeric,
    median_value numeric,
    first_date date,
    last_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        sid.index_name,
        COUNT(*) as data_points_count,
        AVG(sid.mean_value) as mean_value,
        MIN(sid.min_value) as min_value,
        MAX(sid.max_value) as max_value,
        STDDEV(sid.mean_value) as std_value,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sid.mean_value) as median_value,
        MIN(sid.date) as first_date,
        MAX(sid.date) as last_date
    FROM public.satellite_indices_data sid
    WHERE sid.parcel_id = parcel_uuid
        AND sid.index_name = index_name_param
        AND sid.date BETWEEN start_date_param AND end_date_param
    GROUP BY sid.index_name;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_parcels_for_satellite_processing(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_latest_satellite_data(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_satellite_data_statistics(uuid, text, date, date) TO authenticated;

-- Refresh the schema cache (for PostgREST)
NOTIFY pgrst, 'reload schema';
