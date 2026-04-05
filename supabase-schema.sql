-- Nextagen Fleet Platform — Database Schema
-- Run this in Supabase SQL Editor

create extension if not exists "uuid-ossp";

create table if not exists companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  gst_number text,
  phone text,
  email text,
  city text,
  plan text default 'Starter',
  created_at timestamptz default now()
);

create table if not exists company_users (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id),
  user_id uuid references auth.users(id),
  role text default 'admin',
  name text,
  created_at timestamptz default now()
);

create table if not exists vehicles (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id),
  registration_no text not null,
  make text, model text, year integer,
  fuel_type text default 'Diesel',
  capacity_ton numeric,
  status text default 'Active',
  insurance_expiry date,
  fitness_expiry date,
  created_at timestamptz default now()
);

create table if not exists drivers (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id),
  name text not null,
  phone text,
  license_no text,
  license_expiry date,
  salary_per_day numeric,
  status text default 'Available',
  city text,
  created_at timestamptz default now()
);

create table if not exists trips (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id),
  trip_number text unique,
  from_location text,
  to_location text,
  vehicle_registration text,
  driver_name text,
  client_name text,
  status text default 'Scheduled',
  start_date date,
  end_date date,
  freight_amount numeric default 0,
  toll_amount numeric default 0,
  fuel_amount numeric default 0,
  driver_payment numeric default 0,
  distance_km numeric,
  epod_captured boolean default false,
  epod_captured_at timestamptz,
  epod_recipient text,
  epod_signature_url text,
  invoice_raised boolean default false,
  invoice_number text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists invoices (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id),
  trip_id uuid references trips(id),
  invoice_number text unique,
  base_amount numeric default 0,
  cgst_amount numeric default 0,
  sgst_amount numeric default 0,
  total_amount numeric default 0,
  gst_rate numeric default 18,
  status text default 'Pending',
  payment_received_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists maintenance_records (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id),
  vehicle_id uuid references vehicles(id),
  service_type text,
  service_date date,
  cost numeric,
  notes text,
  created_at timestamptz default now()
);

create table if not exists vehicle_locations (
  id uuid primary key default uuid_generate_v4(),
  vehicle_id uuid references vehicles(id),
  latitude numeric,
  longitude numeric,
  speed_kmph numeric,
  recorded_at timestamptz default now()
);

-- Row Level Security
alter table companies enable row level security;
alter table company_users enable row level security;
alter table vehicles enable row level security;
alter table drivers enable row level security;
alter table trips enable row level security;
alter table invoices enable row level security;
alter table maintenance_records enable row level security;
alter table vehicle_locations enable row level security;

-- Policies (company isolation)
create policy "company_users_own" on company_users for all using (user_id = auth.uid());
create policy "vehicles_company" on vehicles for all using (company_id in (select company_id from company_users where user_id = auth.uid()));
create policy "drivers_company" on drivers for all using (company_id in (select company_id from company_users where user_id = auth.uid()));
create policy "trips_company" on trips for all using (company_id in (select company_id from company_users where user_id = auth.uid()));
create policy "invoices_company" on invoices for all using (company_id in (select company_id from company_users where user_id = auth.uid()));
create policy "maintenance_company" on maintenance_records for all using (company_id in (select company_id from company_users where user_id = auth.uid()));
