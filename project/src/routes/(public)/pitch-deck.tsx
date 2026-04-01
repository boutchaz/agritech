import { useState, useCallback } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { marked } from 'marked'
import { ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react'
import { useHotkeys } from '@tanstack/react-hotkeys'
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/(public)/pitch-deck')({
    component: PitchDeck,
})

const RAW_MARKDOWN = `# Pitch Deck: CodeLovers Agritech Platform

## Slide 1: The Problem
**Farming is Complex, Data is Fragmented**

*   **Information Overload**: Farmers juggle multiple disconnected tools for weather, marketplace, and farm management.
*   **Lack of Actionable Insights**: Raw data from satellites is hard to interpret without specialized expertise.
*   **Inefficiency**: Manual record-keeping leads to errors and compliance issues.
*   **Market Access**: Small-to-medium farmers struggle to find the best prices for their produce.

---

## Slide 2: The Solution
**An Integrated Smart Farming Ecosystem**

We provide a comprehensive, all-in-one platform that empowers farmers with decision-making tools:

1.  **Farm & Parcel Management**: Digital twin of the farm with precise mapping and crop history.
2.  **Satellite Intelligence**: Real-time vegetation indices (NDVI, NDRE, SAVI) powered by Google Earth Engine & Sentinel-2.
3.  **Marketplace**: Direct connection between producers and buyers.
4.  **Organization Management**: Role-based access control (RBAC) for teams and cooperatives.

---

## Slide 3: Market Size
**Global Smart Agriculture is Booming**

*   **TAM (Total Addressable Market)**: $22 Billion (Global Smart Agriculture Market by 2025).
*   **SAM (Serviceable Available Market)**: $X Billion (Target Regional Market, e.g., EMEA or North America).
*   **SOM (Serviceable Obtainable Market)**: $X Million (Focus on medium-to-large grain and mixed-crop farms).

*Target Audience: Commercial family farms, agricultural cooperatives, and farm management enterprises.*

---

## Slide 4: Traction
**Building Momentum**

*   **Technology Validated**: 
    *   Satellite processing pipeline operational (12+ indices).
    *   Scalable microservices architecture deployed.
*   **Pilot Phase**: 
    *   Beta testing with initial pilot farms (Placeholder: Insert # of users/farms).
    *   (Placeholder: "Processed over 10,000 hectares of satellite data").

---

## Slide 5: Business Model
**SaaS Subscription (Recurring Revenue)**

We operate on a tiered subscription model managed via Polar.sh:

*   **Starter (Trial Available)**: 
    *   Basic Farm Mapping.
    *   Standard Weather Data.
    *   Marketplace Access.
*   **Professional**: 
    *   Advanced Satellite Analytics (NDVI, Moisture Index).
    *   Historical Data Analysis.
    *   Priority Support.
*   **Enterprise**: 
    *   Multi-organization support.
    *   Custom Integrations (IoT sensors).
    *   Dedicated Account Manager.

*(14-Day Free Trial implemented for all paid tiers)*

---

## Slide 6: Competition
**Why We Win**

| Competitor Type | Examples | Weakness | Our Advantage |
| :--- | :--- | :--- | :--- |
| **Legacy ERPs** | Granular, FarmLogs | Expensive, clunky UI, steep learning curve. | **Modern, intuitive UX** (React/Vite), Mobile-first. |
| **Niche Tools** | OneSoil, Sentinel Hub | Focused only on satellite, lacks business tools. | **Integrated approach**: From soil to sale. |
| **Manual/Excel** | N/A | Error-prone, no real-time data. | **Automation & AI-driven insights**. |

---

## Slide 7: Team
**CodeLovers: Engineering Excellence**

*   **[Your Name/Founder]**: Lead Developer & Visionary. Expert in Full-Stack Architecture (NestJS, React).
*   **[Advisor/Co-founder Name]**: Agronomy Specialist / Business Strategy.
*   **Engineering Team**: Experience with Geospatial Data (GEE), Cloud Infrastructure (Supabase, Docker), and Scalable Systems.

---

## Slide 8: Technology
**Built for Scale & Precision**

*   **Satellite Core**: Python microservice utilizing **Google Earth Engine** for real-time processing of **Sentinel-2** imagery.
*   **Frontend**: High-performance **React** app with **Vite**, **Leaflet** for mapping, and **ECharts** for data visualization.
*   **Backend**: Robust **NestJS** API with **Supabase** (PostgreSQL) for secure data handling and real-time features.
*   **Infrastructure**: Dockerized microservices orchestrated via **Dokploy**, ensuring high availability.

---

## Slide 9: Go-to-Market Strategy
**Acquisition Channels**

1.  **Direct Sales**: Targeting agricultural cooperatives to onboard member farms in bulk.
2.  **Freemium/Trial**: 14-day free trial to lower the barrier to entry (Self-serve PLG - Product Led Growth).
3.  **Partnerships**: Collaborate with local hardware vendors (drone operators, IoT) to bundle software.

---

## Slide 10: Financials
**Projections (3-5 Years)**

*   **Year 1**: Product Launch, Pilot Programs, $X ARR.
*   **Year 2**: Expansion to neighboring regions, Feature maturity, $Y ARR.
*   **Year 3**: Market leader in [Target Region], Enterprise partnerships, $Z ARR.

*(Detailed financial model available upon request)*

---

## Slide 11: The Ask
**Fueling Growth**

We are seeking **$[Amounts]** to:
1.  **Accelerate Development**: Hire 2 senior engineers and 1 data scientist.
2.  **Sales & Marketing**: Launch regional campaigns and attend key trade shows.
3.  **Infrastructure**: Scale satellite processing capacity.

---

## Slide 12: Contact
**Let's Dig In**

*   **Website**: [Your Website URL]
*   **Email**: boutchaz@codelovers.com (Placeholder)
*   **Phone**: +1 (555) 123-4567
*   **Socials**: @CodeLoversAg

*Thank you!*`

function PitchDeck() {
    const [currentSlide, setCurrentSlide] = useState(0)
    const [isFullScreen, setIsFullScreen] = useState(false)

    // Initialize slides directly
    const slides = RAW_MARKDOWN.split(/^---$/m)

    const nextSlide = useCallback(() => {
        setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1))
    }, [slides.length])

    const prevSlide = useCallback(() => {
        setCurrentSlide((prev) => Math.max(prev - 1, 0))
    }, [])

    // Keyboard navigation
    useHotkeys([
        { hotkey: 'ArrowRight', callback: () => nextSlide() },
        { hotkey: 'Space', callback: () => nextSlide() },
        { hotkey: 'ArrowLeft', callback: () => prevSlide() },
        { hotkey: 'F', callback: () => toggleFullScreen() },
    ])

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen()
            setIsFullScreen(true)
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen()
                setIsFullScreen(false)
            }
        }
    }

    // Parse current slide to HTML
    const getRenderedContent = (markdown: string) => {
        if (!markdown) return ''
        return marked.parse(markdown)
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30">
            {/* Background Ambience */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-emerald-900/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-900/20 rounded-full blur-[120px]" />
            </div>

            {/* Controls Header */}
            <div className="fixed top-0 left-0 right-0 z-50 p-4 flex justify-between items-center opacity-0 hover:opacity-100 transition-opacity duration-300">
                <div className="text-sm font-medium text-slate-400">
                    CodeLovers Agritech
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={toggleFullScreen}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        {isFullScreen ? <X size={20} /> : <Maximize2 size={20} />}
                    </Button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex items-center justify-center p-8 z-10 relative">
                <div className="w-full max-w-5xl aspect-video relative">

                    {/* Slide Content */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div
                            key={currentSlide}
                            className="w-full h-full flex flex-col justify-center animate-in fade-in slide-in-from-right-4 duration-500 ease-out p-12 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl"
                        >
                            <div
                                className="prose prose-invert prose-lg max-w-none
                  prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-white
                  prose-h1:text-5xl prose-h1:mb-8 prose-h1:bg-gradient-to-r prose-h1:from-emerald-400 prose-h1:to-blue-500 prose-h1:bg-clip-text prose-h1:text-transparent
                  prose-h2:text-3xl prose-h2:text-emerald-400 prose-h2:mb-6
                  prose-p:text-slate-300 prose-p:leading-relaxed prose-p:text-xl
                  prose-li:text-slate-300 prose-li:marker:text-emerald-500
                  prose-strong:text-white prose-strong:font-semibold
                  prose-table:border-collapse prose-table:w-full
                  prose-th:border-b prose-th:border-slate-700 prose-th:pb-4 prose-th:text-emerald-400 prose-th:text-left
                  prose-td:border-b prose-td:border-slate-800 prose-td:py-4 prose-td:text-slate-300
                "
                                dangerouslySetInnerHTML={{
                                    __html: getRenderedContent(slides[currentSlide] || '')
                                }}
                            />
                        </div>
                    </div>

                </div>
            </div>

            {/* Navigation Footer */}
            <div className="fixed bottom-8 left-0 right-0 z-50 flex justify-center items-center gap-4">
                <Button
                    onClick={prevSlide}
                    disabled={currentSlide === 0}
                    className="p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/10 hover:bg-emerald-500 hover:border-emerald-500 transition-all disabled:opacity-50 disabled:hover:bg-white/10"
                >
                    <ChevronLeft size={24} />
                </Button>

                <div className="px-4 py-2 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-slate-400 font-mono text-sm">
                    {currentSlide + 1} / {slides.length}
                </div>

                <Button
                    onClick={nextSlide}
                    disabled={currentSlide === slides.length - 1}
                    className="p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/10 hover:bg-emerald-500 hover:border-emerald-500 transition-all disabled:opacity-50 disabled:hover:bg-white/10"
                >
                    <ChevronRight size={24} />
                </Button>
            </div>

            {/* Progress Bar */}
            <div className="fixed bottom-0 left-0 h-1 bg-gradient-to-r from-emerald-500 to-blue-500 transition-all duration-300"
                style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
      />
        </div>
    )
}
