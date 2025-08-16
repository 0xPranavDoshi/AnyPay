import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] font-['Poppins',Inter,'SF_Pro_Display',system-ui,sans-serif]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[rgba(15,15,35,0.9)] backdrop-blur-[20px] border-b border-[var(--color-border)] px-8 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="animate-bounce-in text-2xl font-bold text-[var(--color-primary)] tracking-tight">
            AnyPay
          </div>
          <a
            href="/signup"
            className="bg-[var(--color-primary)] cursor-pointer text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity duration-200 animate-scale-in hover:scale-105 transform"
          >
            Launch App
          </a>
        </div>
      </nav>

      {/* Hero Section - Full Screen Height */}
      <section className="full-height bg-[var(--color-bg-primary)] pt-24 pb-24 flex flex-col justify-between relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          {/* Floating geometric shapes */}
          <div className="absolute top-20 left-10 w-16 h-16 border border-[var(--color-primary)]/20 rounded-lg rotate-45 animate-pulse"></div>
          <div className="absolute top-32 right-20 w-8 h-8 bg-[var(--color-primary)]/10 rounded-full animate-pulse delay-1000"></div>
          <div className="absolute top-40 left-1/3 w-12 h-12 border border-[var(--color-primary)]/15 rounded-full animate-pulse delay-2000"></div>
          <div className="absolute top-24 right-1/4 w-10 h-10 border border-[var(--color-primary)]/25 rounded-lg rotate-12 animate-pulse delay-1500"></div>
          <div className="absolute top-48 left-1/5 w-6 h-6 bg-[var(--color-primary)]/15 rounded-full animate-pulse delay-3000"></div>

          {/* Gradient orbs */}
          <div className="absolute bottom-40 right-10 w-24 h-24 bg-gradient-to-br from-[var(--color-primary)]/20 to-transparent rounded-full blur-xl animate-pulse delay-1500"></div>
          <div className="absolute bottom-20 left-1/4 w-20 h-20 bg-gradient-to-br from-[var(--color-primary)]/15 to-transparent rounded-full blur-xl animate-pulse delay-500"></div>
          <div className="absolute bottom-32 right-1/3 w-16 h-16 bg-gradient-to-br from-[var(--color-primary)]/10 to-transparent rounded-full blur-xl animate-pulse delay-2500"></div>
          <div className="absolute bottom-48 left-1/2 w-12 h-12 bg-gradient-to-br from-[var(--color-primary)]/20 to-transparent rounded-full blur-xl animate-pulse delay-1000"></div>

          {/* Network connection lines */}
          <div className="absolute top-1/4 left-1/2 w-px h-32 bg-gradient-to-b from-transparent via-[var(--color-primary)]/20 to-transparent"></div>
          <div className="absolute top-1/3 right-1/3 w-24 h-px bg-gradient-to-r from-transparent via-[var(--color-primary)]/20 to-transparent"></div>
          <div className="absolute top-1/2 left-1/4 w-16 h-px bg-gradient-to-r from-transparent via-[var(--color-primary)]/15 to-transparent"></div>
          <div className="absolute top-2/3 right-1/4 w-px h-20 bg-gradient-to-b from-transparent via-[var(--color-primary)]/15 to-transparent"></div>

          {/* Floating dots with different sizes */}
          <div className="absolute top-16 left-1/2 w-2 h-2 bg-[var(--color-primary)]/30 rounded-full animate-pulse delay-500"></div>
          <div className="absolute top-28 right-16 w-1.5 h-1.5 bg-[var(--color-primary)]/25 rounded-full animate-pulse delay-2000"></div>
          <div className="absolute top-36 left-16 w-1 h-1 bg-[var(--color-primary)]/20 rounded-full animate-pulse delay-3500"></div>
          <div className="absolute top-52 right-1/2 w-2.5 h-2.5 bg-[var(--color-primary)]/35 rounded-full animate-pulse delay-1000"></div>

          {/* Diagonal lines */}
          <div className="absolute top-20 left-1/3 w-20 h-px bg-gradient-to-r from-transparent via-[var(--color-primary)]/15 to-transparent transform rotate-45 origin-left"></div>
          <div className="absolute top-32 right-1/4 w-16 h-px bg-gradient-to-r from-transparent via-[var(--color-primary)]/15 to-transparent transform -rotate-45 origin-right"></div>
        </div>

        <div className="max-w-7xl mx-auto px-8 text-center flex-1 flex flex-col justify-center relative z-10 mt-12">
          {/* Main heading with enhanced styling */}
          <div className="mb-6">
            <h1 className="animate-fade-in-up text-[clamp(2rem,5vw,3.5rem)] font-extrabold mb-4 leading-tight tracking-tight">
              <span className="text-[var(--color-text-secondary)] relative">
                Split Bills.
                <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--color-primary)]/30 to-transparent"></div>
              </span>
              <br />
              <span className="gradient-text relative">
                Any Network.
                <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--color-primary)]/50 to-transparent"></div>
              </span>
              <br />
              <span className="gradient-text relative">
                Any Currency.
                <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--color-primary)]/50 to-transparent"></div>
              </span>
            </h1>
          </div>

          {/* Enhanced description */}
          <div className="animate-fade-in-up stagger-1 text-[clamp(0.875rem,2.5vw,1.125rem)] text-[var(--color-text-secondary)] mb-8 max-w-3xl mx-auto leading-relaxed font-normal relative">
            <p className="relative z-10 mb-3">
              The smart way to manage group expenses and settle debts using any
              cryptocurrency on any blockchain.
              <span className="text-[var(--color-primary)] font-semibold">
                {" "}
                No more currency barriers, no more chain restrictions.
              </span>
            </p>
            {/* Decorative underline */}
            <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-32 h-0.5 bg-gradient-to-r from-transparent via-[var(--color-primary)]/40 to-transparent"></div>
          </div>

          {/* Enhanced CTA buttons */}
          <div className="animate-fade-in-up stagger-2 flex gap-6 justify-center flex-wrap mb-12">
            <button className="group relative overflow-hidden bg-[var(--color-primary)] text-white px-8 py-4 rounded-2xl font-bold text-base hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-[var(--color-primary)]/30">
              <a href="/signup" className="relative z-10 block w-full h-full">
                Start Splitting Bills
              </a>
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary)]/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
            <button className="group relative overflow-hidden bg-transparent text-[var(--color-text-primary)] border-2 border-[var(--color-border)] hover:border-[var(--color-primary)] px-8 py-4 rounded-2xl font-bold text-base hover:scale-105 transition-all duration-300 hover:shadow-xl hover:shadow-[var(--color-primary)]/20">
              <span className="relative z-10">Watch Demo</span>
              <div className="absolute inset-0 bg-[var(--color-primary)]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          </div>
        </div>

        {/* Enhanced Partners Section */}
        <div className="animate-fade-in-up stagger-3 max-w-7xl mx-auto px-8 text-center relative z-10">
          {/* Partners label with enhanced styling */}
          <div className="relative mb-6">
            <div className="text-[var(--color-text-muted)] mb-4 text-sm uppercase tracking-widest font-medium relative">
              <span className="relative z-10">Powered by Industry Leaders</span>
              {/* Decorative elements */}
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-16 h-px bg-gradient-to-r from-transparent via-[var(--color-primary)]/30 to-transparent"></div>
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-16 h-px bg-gradient-to-r from-transparent via-[var(--color-primary)]/30 to-transparent"></div>
            </div>
          </div>

          {/* Enhanced partner cards */}
          <div className="flex gap-8 justify-center items-center flex-wrap">
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/10 to-transparent rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative bg-gradient-to-br from-[var(--color-bg-card)] to-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl px-8 py-4 flex items-center gap-4 hover:scale-105 hover:-translate-y-2 transition-all duration-300 hover:shadow-xl hover:shadow-[var(--color-primary)]/20">
                <Image
                  src="/partners/coinbase.png"
                  alt="Coinbase"
                  width={28}
                  height={28}
                  className="object-contain group-hover:scale-110 transition-transform duration-300"
                />
                <span className="text-[var(--color-text-secondary)] text-lg font-semibold group-hover:text-[var(--color-primary)] transition-colors duration-300">
                  Coinbase
                </span>
              </div>
            </div>

            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/10 to-transparent rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative bg-gradient-to-br from-[var(--color-bg-card)] to-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl px-8 py-4 flex items-center gap-4 hover:scale-105 hover:-translate-y-2 transition-all duration-300 hover:shadow-xl hover:shadow-[var(--color-primary)]/20">
                <Image
                  src="/partners/chainlink.png"
                  alt="Chainlink"
                  width={28}
                  height={28}
                  className="object-contain group-hover:scale-110 transition-transform duration-300"
                />
                <span className="text-[var(--color-text-secondary)] text-lg font-semibold group-hover:text-[var(--color-primary)] transition-colors duration-300">
                  Chainlink
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-8 bg-[var(--color-bg-secondary)] relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-10 w-32 h-32 bg-[var(--color-primary)] rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-40 h-40 bg-[var(--color-primary)] rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="animate-fade-in-up text-[clamp(2rem,5vw,2.5rem)] font-bold text-[var(--color-text-primary)] tracking-tight mb-6">
              Why Choose AnyPay?
            </h2>
            <p className="animate-fade-in-up stagger-1 text-lg text-[var(--color-text-secondary)] max-w-2xl mx-auto leading-relaxed">
              Experience the future of group finance with cutting-edge
              blockchain technology and seamless cross-chain solutions
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Multi-Chain Support */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-primary)]/5 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative bg-gradient-to-br from-[var(--color-bg-card)] to-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-2xl p-8 h-full transform group-hover:scale-105 group-hover:-translate-y-2 transition-all duration-300 hover:shadow-xl hover:shadow-[var(--color-primary)]/10">
                <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-3xl">🌐</span>
                </div>
                <h3 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4 group-hover:text-[var(--color-primary)]/80 transition-colors duration-300">
                  Multi-Chain Support
                </h3>
                <p className="text-[var(--color-text-secondary)] leading-relaxed text-base">
                  Pay with Ethereum, Bitcoin, Solana, or any other
                  cryptocurrency. No matter which blockchain you prefer, AnyPay
                  makes it seamless.
                </p>
              </div>
            </div>

            {/* Group Settlements */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-primary)]/5 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative bg-gradient-to-br from-[var(--color-bg-card)] to-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-2xl p-8 h-full transform group-hover:scale-105 group-hover:-translate-y-2 transition-all duration-300 hover:shadow-xl hover:shadow-[var(--color-primary)]/10">
                <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-3xl">👥</span>
                </div>
                <h3 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4 group-hover:text-[var(--color-primary)]/80 transition-colors duration-300">
                  Group Settlements
                </h3>
                <p className="text-[var(--color-text-secondary)] leading-relaxed text-base">
                  Split bills, settle group expenses, or manage shared debts
                  with friends and family. AnyPay handles complex group dynamics
                  effortlessly.
                </p>
              </div>
            </div>

            {/* Instant Settlements */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-primary)]/5 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative bg-gradient-to-br from-[var(--color-bg-card)] to-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-2xl p-8 h-full transform group-hover:scale-105 group-hover:-translate-y-2 transition-all duration-300 hover:shadow-xl hover:shadow-[var(--color-primary)]/10">
                <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-3xl">⚡</span>
                </div>
                <h3 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4 group-hover:text-[var(--color-primary)]/80 transition-colors duration-300">
                  Instant Settlements
                </h3>
                <p className="text-[var(--color-text-secondary)] leading-relaxed text-base">
                  Powered by Chainlink&apos;s oracle network and Coinbase&apos;s
                  secure infrastructure, settlements are fast, secure, and
                  reliable.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-8 bg-[var(--color-bg-primary)] relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <h2 className="animate-fade-in-up text-[clamp(2rem,5vw,2.5rem)] font-bold text-[var(--color-text-primary)] tracking-tight mb-6">
              How It Works
            </h2>
            <p className="animate-fade-in-up stagger-1 text-lg text-[var(--color-text-secondary)] max-w-2xl mx-auto leading-relaxed">
              Get started with AnyPay in just three simple steps. Our intuitive
              process makes group finance management effortless.
            </p>
          </div>

          {/* Timeline-style layout */}
          <div className="relative">
            {/* Connecting line */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--color-primary)]/30 to-transparent transform -translate-y-1/2 hidden lg:block"></div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-8">
              {/* Step 1: Create Group */}
              <div className="relative group">
                {/* Floating number badge */}
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-12 h-12 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary)]/80 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform duration-300 z-20">
                  1
                </div>

                {/* Main card */}
                <div className="bg-gradient-to-br from-[var(--color-bg-card)] via-[var(--color-bg-secondary)] to-[var(--color-bg-card)] border border-[var(--color-border)] rounded-3xl p-8 pt-16 text-center transform group-hover:scale-105 group-hover:-translate-y-3 transition-all duration-500 hover:shadow-2xl hover:shadow-[var(--color-primary)]/20">
                  {/* Icon with floating effect */}
                  <div className="w-16 h-16 bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-primary)]/10 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:animate-bounce">
                    <span className="text-2xl">👥</span>
                  </div>

                  <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-4 group-hover:text-[var(--color-primary)] transition-colors duration-300">
                    Create Group
                  </h3>
                  <p className="text-[var(--color-text-secondary)] leading-relaxed text-sm">
                    Set up a group and add members for your shared expenses
                  </p>
                </div>
              </div>

              {/* Step 2: Add Expenses */}
              <div className="relative group">
                {/* Floating number badge */}
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-12 h-12 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary)]/80 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform duration-300 z-20">
                  2
                </div>

                {/* Main card */}
                <div className="bg-gradient-to-br from-[var(--color-bg-card)] via-[var(--color-bg-secondary)] to-[var(--color-bg-card)] border border-[var(--color-border)] rounded-3xl p-8 pt-16 text-center transform group-hover:scale-105 group-hover:-translate-y-3 transition-all duration-500 hover:shadow-2xl hover:shadow-[var(--color-primary)]/20">
                  {/* Icon with floating effect */}
                  <div className="w-16 h-16 bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-primary)]/10 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:animate-bounce">
                    <span className="text-2xl">📝</span>
                  </div>

                  <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-4 group-hover:text-[var(--color-primary)] transition-colors duration-300">
                    Add Expenses
                  </h3>
                  <p className="text-[var(--color-text-secondary)] leading-relaxed text-sm">
                    Log shared expenses and let AnyPay calculate who owes what
                  </p>
                </div>
              </div>

              {/* Step 3: Settle Up */}
              <div className="relative group">
                {/* Floating number badge */}
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-12 h-12 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary)]/80 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform duration-300 z-20">
                  3
                </div>

                {/* Main card */}
                <div className="bg-gradient-to-br from-[var(--color-bg-card)] via-[var(--color-bg-secondary)] to-[var(--color-bg-card)] border border-[var(--color-border)] rounded-3xl p-8 pt-16 text-center transform group-hover:scale-105 group-hover:-translate-y-3 transition-all duration-500 hover:shadow-2xl hover:shadow-[var(--color-primary)]/20">
                  {/* Icon with floating effect */}
                  <div className="w-16 h-16 bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-primary)]/10 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:animate-bounce">
                    <span className="text-2xl">💸</span>
                  </div>

                  <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-4 group-hover:text-[var(--color-primary)] transition-colors duration-300">
                    Settle Up
                  </h3>
                  <p className="text-[var(--color-text-secondary)] leading-relaxed text-sm">
                    Pay your share using any cryptocurrency on any blockchain
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-8 bg-[var(--color-primary)] text-center relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-20 h-20 border border-white/20 rounded-full animate-pulse"></div>
          <div className="absolute top-20 right-20 w-12 h-12 bg-white/10 rounded-full animate-pulse delay-1000"></div>
          <div className="absolute bottom-20 left-1/4 w-16 h-16 border border-white/15 rounded-lg rotate-45 animate-pulse delay-2000"></div>
          <div className="absolute bottom-32 right-1/3 w-8 h-8 bg-white/15 rounded-full animate-pulse delay-1500"></div>

          {/* Floating geometric shapes */}
          <div className="absolute top-1/3 left-1/4 w-6 h-6 border border-white/20 rounded-full animate-pulse delay-500"></div>
          <div className="absolute top-2/3 right-1/4 w-4 h-4 bg-white/10 rounded-full animate-pulse delay-3000"></div>
          <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-white/20 rounded-full animate-pulse delay-2500"></div>
        </div>

        <div className="max-w-4xl mx-auto relative z-10">
          <h2 className="animate-fade-in-up text-[clamp(2rem,5vw,2.5rem)] font-bold mb-6 text-white tracking-tight relative">
            <span className="relative">
              Ready to Simplify Group Finances?
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-white/30 rounded-full"></div>
            </span>
          </h2>

          {/* Enhanced description */}
          <div className="animate-fade-in-up stagger-1 text-lg mb-10 text-white/90 leading-relaxed font-normal relative">
            <p className="relative z-10 mb-3">
              Join thousands of users who are already managing group expenses
              seamlessly across any blockchain with AnyPay.
            </p>
            {/* Decorative underline */}
            <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-24 h-0.5 bg-white/20 rounded-full"></div>
          </div>

          <div className="animate-fade-in-up stagger-2 flex gap-6 justify-center flex-wrap">
            <button className="group relative overflow-hidden bg-white text-[var(--color-primary)] hover:bg-gray-50 hover:shadow-2xl transition-all duration-300 px-10 py-4 rounded-2xl font-bold text-lg hover:scale-105 transform">
              <a href="/signup" className="relative z-10 block w-full h-full">
                Launch AnyPay
              </a>
              <div className="absolute inset-0 bg-gradient-to-r from-gray-50 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
            <button className="group relative overflow-hidden bg-transparent text-white border-2 border-white hover:bg-white hover:text-[var(--color-primary)] hover:shadow-2xl transition-all duration-300 px-10 py-4 rounded-2xl font-bold text-lg hover:scale-105 transform">
              <span className="relative z-10">Learn More</span>
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--color-bg-primary)] p-8 border-t border-[var(--color-border)] relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-1/4 w-16 h-16 border border-[var(--color-primary)]/10 rounded-full animate-pulse"></div>
          <div className="absolute top-20 right-1/3 w-8 h-8 bg-[var(--color-primary)]/5 rounded-full animate-pulse delay-2000"></div>
          <div className="absolute bottom-20 left-1/3 w-12 h-12 border border-[var(--color-primary)]/8 rounded-lg rotate-12 animate-pulse delay-1500"></div>
          <div className="absolute bottom-32 right-1/4 w-6 h-6 bg-[var(--color-primary)]/10 rounded-full animate-pulse delay-1000"></div>
        </div>

        <div className="max-w-7xl mx-auto text-center relative z-10">
          {/* Enhanced logo section */}
          <div className="mb-12">
            <div className="animate-fade-in-up text-3xl font-bold text-[var(--color-primary)] mb-6 tracking-tight relative inline-block">
              <span className="relative">
                AnyPay
                <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-[var(--color-primary)]/30 to-[var(--color-primary)]/60 rounded-full"></div>
              </span>
            </div>

            {/* Enhanced description */}
            <div className="animate-fade-in-up stagger-1 text-[var(--color-text-secondary)] mb-8 max-w-2xl mx-auto font-normal text-lg leading-relaxed relative">
              <p className="relative z-10 mb-3">
                The smart way to manage group expenses and settle debts. Any
                currency, any chain, any time.
              </p>
              {/* Decorative underline */}
              <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-32 h-0.5 bg-gradient-to-r from-transparent via-[var(--color-primary)]/20 to-transparent"></div>
            </div>
          </div>

          {/* Enhanced partners section */}
          <div className="animate-fade-in-up stagger-2 mb-12">
            <div className="relative mb-6">
              <span className="text-[var(--color-text-muted)] text-sm uppercase tracking-widest font-medium relative">
                <span className="relative z-10">
                  Powered by Industry Leaders
                </span>
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-20 h-px bg-gradient-to-r from-transparent via-[var(--color-primary)]/20 to-transparent"></div>
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-20 h-px bg-gradient-to-r from-transparent via-[var(--color-primary)]/20 to-transparent"></div>
              </span>
            </div>

            <div className="flex gap-8 justify-center items-center flex-wrap">
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/10 to-transparent rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative bg-gradient-to-br from-[var(--color-bg-card)] to-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl px-6 py-3 flex items-center gap-3 hover:scale-105 hover:-translate-y-1 transition-all duration-300 hover:shadow-lg hover:shadow-[var(--color-primary)]/20">
                  <Image
                    src="/partners/coinbase.png"
                    alt="Coinbase"
                    width={20}
                    height={20}
                    className="object-contain group-hover:scale-110 transition-transform duration-300"
                  />
                  <span className="text-[var(--color-text-secondary)] text-sm font-semibold group-hover:text-[var(--color-primary)] transition-colors duration-300">
                    Coinbase
                  </span>
                </div>
              </div>

              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/10 to-transparent rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative bg-gradient-to-br from-[var(--color-bg-card)] to-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl px-6 py-3 flex items-center gap-3 hover:scale-105 hover:-translate-y-1 transition-all duration-300 hover:shadow-lg hover:shadow-[var(--color-primary)]/20">
                  <Image
                    src="/partners/chainlink.png"
                    alt="Chainlink"
                    width={20}
                    height={20}
                    className="object-contain group-hover:scale-110 transition-transform duration-300"
                  />
                  <span className="text-[var(--color-text-secondary)] text-sm font-semibold group-hover:text-[var(--color-primary)] transition-colors duration-300">
                    Chainlink
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Copyright with enhanced styling */}
          <div className="animate-fade-in-up stagger-3 relative">
            <div className="text-[var(--color-text-muted)] text-sm border-t border-[var(--color-border)] pt-8 font-normal relative">
              <span className="relative">
                © 2024 AnyPay. All rights reserved.
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-16 h-px bg-gradient-to-r from-transparent via-[var(--color-primary)]/15 to-transparent"></div>
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
