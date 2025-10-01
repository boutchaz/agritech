Develop a comprehensive "Weather & Climate Analytics" dashboard for individual farm parcels within our agritech application. The core purpose of this dashboard is to provide farmers with actionable insights by comparing current weather conditions against long-term historical climate normals for their specific parcel's location.

Key Features & Components:

The dashboard should be organized into three main sections, based on the provided designs:

1. Temperature Analysis
Implement three multi-series line charts to track and compare daily temperature variations.

Chart 1: Minimum Temperature

Data Series 1 (Current): Actual daily minimum temperature for the selected period.

Data Series 2 (Historical): Long-Term Normal (LTN) minimum temperature for each day of the year.

Chart 2: Mean Temperature

Data Series 1 (Current): Actual daily mean temperature.

Data Series 2 (Historical): Long-Term Normal (LTN) mean temperature.

Chart 3: Maximum Temperature

Data Series 1 (Current): Actual daily maximum temperature.

Data Series 2 (Historical): Long-Term Normal (LTN) maximum temperature.

Common Features:

X-Axis: Date (e.g., 01-Jan-2025).

Y-Axis: Temperature in Celsius (°C).

Interactivity: Tooltips on hover should display the exact values for both current and historical data for a given date.

2. Precipitation Analysis
Implement a grouped bar chart to compare monthly rainfall against historical averages.

Chart Type: Grouped Bar Chart.

X-Axis: Month and Year (e.g., April 2024, May 2024).

Y-Axis: Precipitation in millimeters (mm).

Data Series (for each month):

Bar 1: Current Month's Total Precipitation.

Bar 2: Long-Term Normal (LTN) Precipitation for that month.

Interactivity: Tooltips on hover should show the exact precipitation values.

3. Dry/Wet Conditions & Derivatives
This section requires analyzing daily data to create derived monthly metrics. These are combination charts (bar + line).

Chart 1: Wet Days Analysis

Primary Metric (Bar Chart): The total count of "Wet Days" in a given month. (A "Wet Day" could be defined as a day with > 1mm of rain).

Comparison Metric (Line Chart): The Long-Term Normal (LTN) count of wet days for that month.

Derived Metric (Bar Chart): Show the "Deficit/Excess" number of wet days (Actual - LTN).

Chart 2: Dry Days Analysis

Primary Metric (Bar Chart): The total count of "Dry Days" in a month.

Comparison Metric (Line Chart): The Long-Term Normal (LTN) count of dry days for that month.

Derived Metric (Bar Chart): Show the "Deficit/Excess" number of dry days, plotted against a zero-axis.

Chart 3: Dry Spell Conditions (DSC) - e.g., "5 days with < 5mm rainfall"

Primary Metric (Bar Chart): Count the number of occurrences of this specific dry spell event within the month.

Comparison Metric (Line Chart): The Long-Term Normal (LTN) number of occurrences for that month.

Derived Metric (Bar Chart): Show the "Deficit/Excess" number of occurrences.

Chart 4: Short Dry Spells - e.g., "1-3 consecutive dry days"

Primary Metric (Bar Chart): Count of these short dry spell events.

Comparison Metric (Line Chart): The Long-Term Normal (LTN) count for that month.

Derived Metric (Bar Chart): Show the "Deficit/Excess" count.

Data Requirements & Sourcing:

The system must integrate with a reliable weather data API (e.g., OpenMeteo, Meteomatics) that provides both:

Recent & Forecast Data: Daily and monthly weather data for specific latitude/longitude coordinates.

Historical Climate Normals: 30-year average climate data (e.g., 1991-2020 normals) for the same coordinates.

Required data points include: min/max/mean temperature, total precipitation, and daily rainfall amounts to calculate the derived metrics.

All data queries must be triggered based on the geographic location of the currently selected farm parcel.

UI/UX Considerations:

This dashboard should be a new view accessible when a user is viewing a specific parcel.

The user should be able to select the time range for the "Current" data (e.g., Last 12 months, Year-to-date, Custom Range).

All charts must have clear legends explaining the different data series.

The design should be clean, responsive, and easy to interpret at a glance.