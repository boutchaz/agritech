/*
  # Create IoT Infrastructure Tables

  1. New Tables
    - sensor_devices: Links physical devices to parcels
    - sensor_readings: Stores raw sensor data
    - climate_readings: Stores climate-specific readings

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create sensor_devices table
CREATE TABLE IF NOT EXISTS sensor_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL UNIQUE,
  parcel_id uuid REFERENCES parcels(id),
  name text NOT NULL,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  last_seen timestamptz,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create sensor_readings table
CREATE TABLE IF NOT EXISTS sensor_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  timestamp timestamptz NOT NULL,
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create climate_readings table
CREATE TABLE IF NOT EXISTS climate_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id uuid REFERENCES parcels(id),
  type text NOT NULL,
  value numeric NOT NULL,
  unit text NOT NULL,
  timestamp timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE sensor_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE climate_readings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own devices"
  ON sensor_devices FOR SELECT
  TO authenticated
  USING (
    parcel_id IN (
      SELECT p.id 
      FROM parcels p
      JOIN crops c ON p.crop_id = c.id
      JOIN farms f ON c.farm_id = f.id
      WHERE f.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view readings from their devices"
  ON sensor_readings FOR SELECT
  TO authenticated
  USING (
    device_id IN (
      SELECT device_id 
      FROM sensor_devices sd
      JOIN parcels p ON sd.parcel_id = p.id
      JOIN crops c ON p.crop_id = c.id
      JOIN farms f ON c.farm_id = f.id
      WHERE f.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view climate data for their parcels"
  ON climate_readings FOR SELECT
  TO authenticated
  USING (
    parcel_id IN (
      SELECT p.id 
      FROM parcels p
      JOIN crops c ON p.crop_id = c.id
      JOIN farms f ON c.farm_id = f.id
      WHERE f.user_id = auth.uid()
    )
  );

-- Add trigger for updating timestamps
CREATE TRIGGER update_sensor_devices_updated_at
    BEFORE UPDATE ON sensor_devices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();