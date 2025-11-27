/**
 * Seed script to create blog categories and posts for AgriTech platform
 *
 * Prerequisites:
 * 1. Strapi must be running
 * 2. Blog and Blog Category content types must be created
 * 3. API permissions must be configured in Strapi admin:
 *    - Settings > Users & Permissions plugin > Roles > Public
 *    - Enable: find, findOne for Blog and Blog-Category
 *
 * Usage:
 *   node cms/scripts/seed-blogs.js
 */

const API_URL = process.env.STRAPI_API_URL || 'https://cms.thebzlab.online/api';
const API_TOKEN = process.env.STRAPI_API_TOKEN || 'a1d558d8dc0385d8bad341ad1bc1023b666174e3cbe6762dcbcacbc36469fbef502ff0510cd7a582f2e17117d33df44fb8397a5f283461e03eb7139bf2044bd26390a340e79840f65c1469cf79f58741037e8259de45f5b3214f0e1501ca5d8f4ef5fc53abef598a2f635a30779e580620248f43e535d0decbe7b8146a69603e';

// Helper function to make API requests
async function apiRequest(endpoint, method = 'GET', data = null) {
  const url = `${API_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_TOKEN}`,
    },
  };

  if (data) {
    options.body = JSON.stringify({ data });
  }

  const response = await fetch(url, options);
  const result = await response.json();

  if (!response.ok) {
    console.error(`Error ${method} ${endpoint}:`, result);
    throw new Error(result.error?.message || 'API request failed');
  }

  return result;
}

// Blog Categories based on AgriTech platform features
const categories = [
  {
    name: 'Farm Management',
    slug: 'farm-management',
    description: 'Best practices and tips for managing your farm operations efficiently',
  },
  {
    name: 'Financial Management',
    slug: 'financial-management',
    description: 'Accounting, budgeting, and financial planning for agricultural businesses',
  },
  {
    name: 'Harvest & Production',
    slug: 'harvest-production',
    description: 'Insights on harvest planning, production tracking, and yield optimization',
  },
  {
    name: 'Stock & Inventory',
    slug: 'stock-inventory',
    description: 'Stock management, inventory tracking, and warehouse operations',
  },
  {
    name: 'Technology & Innovation',
    slug: 'technology-innovation',
    description: 'Latest AgriTech innovations and digital transformation in agriculture',
  },
  {
    name: 'Sustainability',
    slug: 'sustainability',
    description: 'Sustainable farming practices and environmental stewardship',
  },
];

// Blog Posts showcasing AgriTech platform capabilities
const blogPosts = [
  {
    title: 'Getting Started with Digital Farm Management',
    slug: 'getting-started-digital-farm-management',
    excerpt: 'Discover how our AgriTech platform can transform your farm operations with integrated management tools for parcels, crops, workers, and finances.',
    content: `# Getting Started with Digital Farm Management

The agricultural industry is rapidly evolving, and digital tools are becoming essential for modern farm management. Our AgriTech platform provides a comprehensive solution to manage every aspect of your farming operations.

## Key Features

### Farm Hierarchy Management
Organize your agricultural enterprise with a clear hierarchical structure:
- **Farms**: Manage multiple farms from a single dashboard
- **Parcels**: Track individual land parcels with detailed information
- **Crops**: Monitor crop varieties, planting dates, and growth cycles

### Operational Excellence
- Real-time task assignment and tracking
- Worker management with performance metrics
- Equipment and infrastructure tracking
- Quality control and compliance

### Financial Integration
Every operation connects directly to your financial records:
- Automatic journal entries for harvest activities
- Cost tracking per parcel and crop
- Profitability analysis by season
- Budget planning and forecasting

## Getting Started

1. **Set up your farm structure**: Define your farms and parcels
2. **Configure your team**: Add workers and assign roles
3. **Plan your season**: Create planting schedules and tasks
4. **Track operations**: Log activities and monitor progress
5. **Analyze results**: Review financial reports and performance metrics

Start your digital transformation journey today and experience the power of integrated farm management.`,
    author: 'AgriTech Team',
    reading_time: 5,
    is_featured: true,
    category_slug: 'farm-management',
    tags: ['getting started', 'farm management', 'digital transformation'],
    seo_title: 'Digital Farm Management Guide | AgriTech Platform',
    seo_description: 'Learn how to get started with digital farm management using our comprehensive AgriTech platform. Manage farms, parcels, crops, and finances in one place.',
  },
  {
    title: 'From Harvest to Finance: Automating Your Agricultural Accounting',
    slug: 'harvest-to-finance-automation',
    excerpt: 'Learn how our task-to-harvest-to-finance workflow eliminates manual data entry and ensures every harvest is properly recorded in your books.',
    content: `# From Harvest to Finance: Automating Your Agricultural Accounting

One of the biggest challenges in agricultural accounting is connecting field operations to financial records. Our platform's innovative workflow automates this process completely.

## The Complete Workflow

### 1. Task Assignment
Create a harvest task with:
- Assigned workers and supervisors
- Target parcel and crop
- Expected quantity and timeline
- Quality requirements

### 2. Harvest Execution
When workers complete the task:
- Record actual quantities harvested
- Document quality metrics
- Track worker hours and performance
- Note any issues or observations

### 3. Reception Batch Processing
The harvest flows through a 4-step stepper process:

**Step 1: Reception**
- Weight verification
- Initial quality inspection
- Warehouse assignment

**Step 2: Quality Control**
- Detailed quality grading (A, B, C, Extra, First, Second, Third)
- Quality score (1-10 scale)
- Defect documentation
- Temperature and humidity monitoring

**Step 3: Decision Making**
- Direct sale
- Storage allocation
- Processing assignment
- Rejection handling

**Step 4: Financial Processing**
- Automatic payment record creation for workers
- Journal entry generation with balanced debits/credits
- Cost allocation to proper accounts
- Integration with your chart of accounts

## Benefits

- **Zero manual data entry**: Operations automatically create financial records
- **Real-time accuracy**: Financial data updates as work happens
- **Complete traceability**: Track any product from harvest to sale
- **Compliance ready**: Maintain detailed audit trails
- **Better decision making**: Access to real-time financial insights

## Getting Started

Enable the harvest-to-finance workflow in your settings and start experiencing the power of automated agricultural accounting.`,
    author: 'AgriTech Team',
    reading_time: 7,
    is_featured: true,
    category_slug: 'financial-management',
    tags: ['automation', 'accounting', 'harvest', 'workflow', 'finance'],
    seo_title: 'Automated Agricultural Accounting | Harvest to Finance Workflow',
    seo_description: 'Automate your agricultural accounting with our harvest-to-finance workflow. Eliminate manual data entry and ensure accurate financial records.',
  },
  {
    title: 'Smart Inventory Management for Agricultural Products',
    slug: 'smart-inventory-management',
    excerpt: 'Optimize your warehouse operations with intelligent stock tracking, batch management, and automated stock movements.',
    content: `# Smart Inventory Management for Agricultural Products

Managing inventory in agriculture is complex. Different products, varying quality grades, seasonal variations, and perishability all create unique challenges. Our platform addresses these with specialized inventory management features.

## Key Features

### Item Management
- Hierarchical item groups (Seeds, Fertilizers, Produce, Equipment)
- Flexible item configuration (sales items, purchase items, stock items)
- Unit of measure management
- Crop-specific attributes (variety, grade, certification)

### Stock Tracking
- Real-time inventory levels across multiple warehouses
- Batch and lot tracking
- Quality grade segregation
- Expiration date management

### Warehouse Operations
- Multi-warehouse support
- Stock transfers between locations
- Reception and dispatch processing
- Quality control integration

### Stock Movements
- Automatic stock entries from harvest
- Purchase and sale integration
- Manufacturing/processing tracking
- Waste and loss documentation

## Stock Entry Types

Our platform supports all standard stock movements:

- **Material Receipt**: Record incoming inventory
- **Material Issue**: Track outgoing materials
- **Material Transfer**: Move stock between warehouses
- **Stock Reconciliation**: Adjust for physical counts
- **Manufacture**: Convert raw materials to finished goods
- **Repack**: Change packaging or splitting batches

## Inventory Valuation

Choose the valuation method that fits your business:
- FIFO (First In, First Out)
- Moving Average
- Batch-wise valuation

## Benefits

- **Reduce waste**: Track expiration dates and quality degradation
- **Optimize storage**: Know what's where and make better space decisions
- **Improve cash flow**: Maintain optimal stock levels
- **Ensure quality**: Separate and track different quality grades
- **Meet compliance**: Maintain required records and traceability

Transform your warehouse operations with intelligent inventory management designed for agriculture.`,
    author: 'AgriTech Team',
    reading_time: 6,
    is_featured: true,
    category_slug: 'stock-inventory',
    tags: ['inventory', 'warehouse', 'stock management', 'batch tracking'],
    seo_title: 'Agricultural Inventory Management System | Stock Tracking',
    seo_description: 'Optimize warehouse operations with smart inventory management for agricultural products. Track batches, quality grades, and stock movements.',
  },
  {
    title: 'Maximizing Parcel Profitability with Data-Driven Insights',
    slug: 'parcel-profitability-analysis',
    excerpt: 'Use our analytics tools to understand which parcels are most profitable and make informed decisions about crop selection and resource allocation.',
    content: `# Maximizing Parcel Profitability with Data-Driven Insights

Understanding profitability at the parcel level is crucial for making informed agricultural decisions. Our platform provides powerful analytics to help you optimize your farm's performance.

## Profitability Metrics

### Revenue Tracking
- Harvest quantities and values by parcel
- Quality grade premiums
- Market price integration
- Multi-year comparison

### Cost Analysis
- Labor costs (workers, supervision)
- Input costs (seeds, fertilizers, pesticides)
- Equipment usage
- Infrastructure maintenance
- Overhead allocation

### Profitability Indicators
- Gross margin per parcel
- Return on investment (ROI)
- Cost per unit produced
- Profit per hectare
- Trend analysis over seasons

## Key Reports

### Parcel Performance Dashboard
See at a glance:
- Top performing parcels
- Profitability trends
- Cost breakdowns
- Yield comparisons

### Crop Comparison Analysis
Compare different crops:
- Revenue per hectare
- Labor requirements
- Input costs
- Market demand
- Profitability ranking

### Seasonal Analysis
Understand seasonal variations:
- Weather impact on yields
- Market price fluctuations
- Labor availability
- Cost variations

## Decision Support

Use these insights to:

1. **Optimize crop selection**: Choose crops that maximize profitability for each parcel
2. **Resource allocation**: Direct resources to high-performing parcels
3. **Identify improvements**: Find underperforming areas and implement changes
4. **Plan investments**: Make data-driven decisions about infrastructure upgrades
5. **Budget accurately**: Use historical data for realistic planning

## Getting Started

1. Ensure all costs are properly tracked in the system
2. Record accurate harvest data with quality grades
3. Link market prices for your products
4. Review monthly profitability reports
5. Adjust strategies based on insights

Let data guide your agricultural decisions and maximize the profitability of every parcel.`,
    author: 'AgriTech Team',
    reading_time: 6,
    is_featured: false,
    category_slug: 'farm-management',
    tags: ['profitability', 'analytics', 'data-driven', 'parcel management', 'ROI'],
    seo_title: 'Parcel Profitability Analysis for Farms | AgriTech Analytics',
    seo_description: 'Maximize farm profitability with data-driven parcel analysis. Track costs, revenues, and ROI to make informed agricultural decisions.',
  },
  {
    title: 'Worker Management and Payment Automation',
    slug: 'worker-management-payment-automation',
    excerpt: 'Streamline your workforce management with automated time tracking, performance monitoring, and integrated payroll processing.',
    content: `# Worker Management and Payment Automation

Managing agricultural workers efficiently is critical for farm productivity and compliance. Our platform provides comprehensive tools for workforce management and payment automation.

## Worker Types

### Permanent Employees
- Fixed salary structures
- Benefit management
- Leave tracking
- Performance reviews

### Day Laborers
- Daily attendance tracking
- Variable pay rates
- Task-based assignments
- Seasonal workforce management

### Contract Workers (Metayage)
- Revenue sharing agreements
- Crop-specific contracts
- Settlement calculations
- Multi-season tracking

## Time and Attendance

### Automated Tracking
- Task-based time logging
- GPS verification (optional)
- Supervisor approval workflow
- Exception management

### Performance Metrics
- Productivity measurements
- Quality ratings
- Task completion rates
- Efficiency analysis

## Payment Processing

### Payment Types
- **Daily Wage**: Fixed or variable daily rates
- **Per Unit**: Based on quantity harvested/processed
- **Bonus**: Performance-based incentives
- **Overtime**: Extra hours compensation

### Automation Features
- Automatic payment record creation from completed tasks
- Integration with financial journals
- Multi-payment method support (cash, bank transfer, mobile money)
- Advance and deduction management

### Financial Integration
Every payment automatically:
- Creates journal entries
- Updates worker accounts
- Reconciles with bank transactions
- Generates payment reports

## Compliance and Reporting

### Labor Compliance
- Work hour tracking
- Legal compliance monitoring
- Contract management
- Safety incident logging

### Reports
- Payroll summaries
- Worker productivity
- Cost per task/crop
- Labor utilization

## Benefits

- **Reduce administrative overhead**: Automate repetitive tasks
- **Ensure accuracy**: Eliminate manual calculation errors
- **Improve transparency**: Workers can see their earnings in real-time
- **Maintain compliance**: Automated tracking of labor regulations
- **Optimize workforce**: Identify top performers and optimize assignments

## Getting Started

1. Set up worker profiles and payment structures
2. Configure approval workflows
3. Enable task-based time tracking
4. Set up payment accounts
5. Review and process payments regularly

Transform your workforce management with automation designed for agricultural operations.`,
    author: 'AgriTech Team',
    reading_time: 7,
    is_featured: false,
    category_slug: 'farm-management',
    tags: ['workers', 'payroll', 'automation', 'workforce management', 'payments'],
    seo_title: 'Agricultural Worker Management & Payment Automation',
    seo_description: 'Streamline workforce management with automated time tracking, performance monitoring, and integrated payroll for agricultural workers.',
  },
  {
    title: 'Sustainable Agriculture: Tracking Environmental Impact',
    slug: 'sustainable-agriculture-environmental-tracking',
    excerpt: 'Monitor and reduce your environmental footprint with tools for tracking water usage, chemical applications, and carbon emissions.',
    content: `# Sustainable Agriculture: Tracking Environmental Impact

Modern agriculture must balance productivity with environmental responsibility. Our platform helps you track, analyze, and reduce your environmental impact.

## Environmental Metrics

### Water Management
- Irrigation tracking by parcel
- Water consumption analysis
- Efficiency calculations
- Drought response planning

### Chemical Usage
- Pesticide and fertilizer tracking
- Application rates per hectare
- Organic certification compliance
- Safety interval monitoring

### Carbon Footprint
- Equipment fuel consumption
- Transportation emissions
- Input production impact
- Carbon sequestration tracking

## Sustainability Features

### Input Optimization
- Minimize chemical usage through precise tracking
- Reduce water waste with efficiency monitoring
- Optimize equipment usage
- Track organic alternatives

### Compliance Tools
- Organic certification documentation
- Chemical application records
- Buffer zone management
- Audit trail maintenance

### Reporting
- Environmental impact dashboards
- Sustainability scorecards
- Certification reports
- Trend analysis

## Best Practices

### Precision Agriculture
- Use data to apply inputs only where needed
- Monitor soil health indicators
- Track beneficial insect populations
- Implement IPM (Integrated Pest Management)

### Resource Conservation
- Schedule irrigation based on soil moisture
- Use weather data for optimal chemical application
- Minimize equipment idle time
- Plan efficient harvest routes

### Biodiversity Support
- Track wildlife observations
- Manage habitat areas
- Document beneficial species
- Monitor pollinator activity

## Certification Support

Our platform helps maintain records for:
- Organic certification
- Fair trade compliance
- Rainforest Alliance
- GlobalGAP
- Other sustainability standards

## Benefits

- **Meet consumer demands**: Demonstrate sustainable practices
- **Reduce costs**: Optimize input usage
- **Ensure compliance**: Maintain required documentation
- **Improve reputation**: Showcase environmental stewardship
- **Future-proof operations**: Adapt to changing regulations

## Getting Started

1. Set up environmental tracking parameters
2. Configure input tracking
3. Establish baseline metrics
4. Set sustainability goals
5. Monitor progress regularly

Build a more sustainable agricultural operation while maintaining profitability and productivity.`,
    author: 'AgriTech Team',
    reading_time: 8,
    is_featured: false,
    category_slug: 'sustainability',
    tags: ['sustainability', 'environment', 'organic', 'certification', 'carbon footprint'],
    seo_title: 'Sustainable Agriculture & Environmental Impact Tracking',
    seo_description: 'Track and reduce environmental impact in agriculture. Monitor water usage, chemical applications, and carbon emissions for sustainable farming.',
  },
];

// Main seeding function
async function seedBlogs() {
  console.log('🌱 Starting blog seeding process...\n');

  try {
    // Step 1: Create categories
    console.log('📁 Creating blog categories...');
    const createdCategories = {};

    for (const category of categories) {
      try {
        const result = await apiRequest('/blog-categories', 'POST', category);
        createdCategories[category.slug] = result.data.id;
        console.log(`✅ Created category: ${category.name}`);
      } catch (error) {
        console.error(`❌ Failed to create category ${category.name}:`, error.message);
      }
    }

    console.log(`\n✅ Created ${Object.keys(createdCategories).length}/${categories.length} categories\n`);

    // Step 2: Create blog posts
    console.log('📝 Creating blog posts...');
    let createdPosts = 0;

    for (const post of blogPosts) {
      try {
        const { category_slug, ...postData } = post;

        // Add category relation if category was created
        if (createdCategories[category_slug]) {
          postData.blog_category = createdCategories[category_slug];
        }

        const result = await apiRequest('/blogs', 'POST', postData);
        console.log(`✅ Created post: ${post.title}`);

        // Publish the post if it's featured
        if (post.is_featured) {
          try {
            await apiRequest(`/blogs/${result.data.id}`, 'PUT', {
              ...postData,
              publishedAt: new Date().toISOString()
            });
            console.log(`  📢 Published featured post`);
          } catch (error) {
            console.error(`  ⚠️  Failed to publish:`, error.message);
          }
        }

        createdPosts++;
      } catch (error) {
        console.error(`❌ Failed to create post ${post.title}:`, error.message);
      }
    }

    console.log(`\n✅ Created ${createdPosts}/${blogPosts.length} blog posts\n`);
    console.log('🎉 Blog seeding completed successfully!');

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

// Run the seeding
seedBlogs();
