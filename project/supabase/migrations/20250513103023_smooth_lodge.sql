/*
  # Add Employees and Day Laborers Management

  1. New Tables
    - `employees`: Store permanent employees information
    - `day_laborers`: Store day laborers information
    - `work_records`: Track work hours and tasks

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid REFERENCES farms(id) NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  cin text NOT NULL,
  phone text,
  address text,
  hire_date date NOT NULL,
  position text NOT NULL,
  salary numeric NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create day_laborers table
CREATE TABLE IF NOT EXISTS day_laborers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid REFERENCES farms(id) NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  cin text NOT NULL,
  phone text,
  address text,
  daily_rate numeric NOT NULL,
  specialties text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create work_records table
CREATE TABLE IF NOT EXISTS work_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid REFERENCES farms(id) NOT NULL,
  worker_id uuid NOT NULL,
  worker_type text NOT NULL CHECK (worker_type IN ('employee', 'day_laborer')),
  work_date date NOT NULL,
  hours_worked numeric,
  task_description text NOT NULL,
  parcel_id uuid REFERENCES parcels(id),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_laborers ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_records ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their employees"
  ON employees
  FOR ALL
  TO authenticated
  USING (farm_id IN (SELECT id FROM farms WHERE user_id = auth.uid()))
  WITH CHECK (farm_id IN (SELECT id FROM farms WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their day laborers"
  ON day_laborers
  FOR ALL
  TO authenticated
  USING (farm_id IN (SELECT id FROM farms WHERE user_id = auth.uid()))
  WITH CHECK (farm_id IN (SELECT id FROM farms WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage work records"
  ON work_records
  FOR ALL
  TO authenticated
  USING (farm_id IN (SELECT id FROM farms WHERE user_id = auth.uid()))
  WITH CHECK (farm_id IN (SELECT id FROM farms WHERE user_id = auth.uid()));

-- Add triggers for updating timestamps
CREATE TRIGGER update_employees_updated_at
    BEFORE UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_day_laborers_updated_at
    BEFORE UPDATE ON day_laborers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_records_updated_at
    BEFORE UPDATE ON work_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();