export default function MarketplaceHome() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-14 flex items-center border-b">
        <a className="flex items-center justify-center" href="#">
          <span className="font-bold text-xl text-green-700">AgriTech Market</span>
        </a>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <a className="text-sm font-medium hover:underline underline-offset-4" href="/products">
            Products
          </a>
          <a className="text-sm font-medium hover:underline underline-offset-4" href="/categories">
            Categories
          </a>
          <a className="text-sm font-medium hover:underline underline-offset-4" href="/sellers">
            Sellers
          </a>
          <a className="text-sm font-medium hover:underline underline-offset-4" href="/dashboard">
            Sell
          </a>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-green-50">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  The Premium Marketplace for Agriculture
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  Connect with trusted farms, suppliers, and buyers. Trade crops, equipment, and services securely.
                </p>
              </div>
              <div className="space-x-4">
                <a
                  className="inline-flex h-9 items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-green-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:pointer-events-none disabled:opacity-50"
                  href="/products"
                >
                  Browse Products
                </a>
                <a
                  className="inline-flex h-9 items-center justify-center rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:pointer-events-none disabled:opacity-50"
                  href="/dashboard"
                >
                  Start Selling
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-center mb-12">
              Featured Categories
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="group relative overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-all">
                <div className="aspect-video bg-gray-100 flex items-center justify-center">
                  <span className="text-4xl">🌾</span>
                </div>
                <div className="p-4 bg-white">
                  <h3 className="font-bold text-lg">Crops & Produce</h3>
                  <p className="text-sm text-gray-500">Fresh grains, fruits, vegetables</p>
                </div>
              </div>
              <div className="group relative overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-all">
                <div className="aspect-video bg-gray-100 flex items-center justify-center">
                  <span className="text-4xl">🚜</span>
                </div>
                <div className="p-4 bg-white">
                  <h3 className="font-bold text-lg">Machinery & Tools</h3>
                  <p className="text-sm text-gray-500">Tractors, harvesters, irrigation</p>
                </div>
              </div>
              <div className="group relative overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-all">
                <div className="aspect-video bg-gray-100 flex items-center justify-center">
                  <span className="text-4xl">🧪</span>
                </div>
                <div className="p-4 bg-white">
                  <h3 className="font-bold text-lg">Inputs</h3>
                  <p className="text-sm text-gray-500">Fertilizers, seeds, pesticides</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-gray-500 dark:text-gray-400">© 2025 AgriTech Inc. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <a className="text-xs hover:underline underline-offset-4" href="#">
            Terms of Service
          </a>
          <a className="text-xs hover:underline underline-offset-4" href="#">
            Privacy
          </a>
        </nav>
      </footer>
    </div>
  );
}
