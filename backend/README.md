# Brand Visibility Hub - Backend & Database

This folder contains the database schema and data ingestion scripts for the Brand Visibility Hub.

## 1. Database Schema (`schema.sql`)

We use **PostgreSQL** (via Supabase) to store scraper results. The schema is designed for scale and historical tracking.

### Key Concepts

*   **Global Deduplication**:
    *   **Questions**: Stored uniquely in the `questions` table using an MD5 hash of the text.
    *   **Products**: Stored uniquely in the `products` table using ASIN (or generated hash).
    *   **Personas & Categories**: Normalized dimension tables.

*   **Audit Structure**:
    *   `Audit` -> `Run` -> `Conversation` -> `Turn` -> `Snapshot`.
    *   Each scraper run creates a new `Run` entry.
    *   **Snapshots**: We store the *answer*, *products*, and *suggested questions* for every turn in `run_turn_snapshots`. This allows us to track performance over time without overwriting old data.

*   **Scalability**:
    *   The `run_turn_snapshots` table is **partitioned by month** to handle millions of records efficiently.
    *   Materialized views (e.g., `mv_dashboard_stats`) are used for fast dashboard loading.

## 2. Data Ingestion (`ingest_data.py`)

This Python script parses raw scraper outputs (CSV or JSON) and populates the database.

### Features
*   **Idempotent**: Can be run multiple times safely. It won't create duplicate questions or products.
*   **Auto-Detection**: Heuristics to detect Personas and Categories from filenames.
*   **Multi-Format**: Supports both `.csv` and `.json` result files.

### Usage

1.  **Install Requirements**:
    ```bash
    pip install pandas psycopg2-binary
    ```

2.  **Run Ingestion**:
    ```bash
    python3 ingest_data.py [optional_path_to_data]
    ```
    *   If no path is provided, it scans the current directory and subdirectories for result files.
    *   It will prompt for your **Supabase Database Password**.
    *   Host: `db.kgvvclhueanzksaewvuv.supabase.co` (pre-configured).

## 3. Directory Structure

*   `schema.sql`: The SQL command to create tables, indexes, and partitions. (Already applied to Production).
*   `ingest_data.py`: The script to load data.
