"use client";

export default function Login() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] font-['Poppins',Inter,'SF_Pro_Display',system-ui,sans-serif]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[rgba(15,15,35,0.9)] backdrop-blur-[20px] border-b border-[var(--color-border)] px-8 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="animate-bounce-in text-2xl font-bold text-[var(--color-primary)] tracking-tight">
            AnyPay
          </div>
          <button
            onClick={() => window.history.back()}
            className="bg-[var(--color-primary)] text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity duration-200 animate-scale-in hover:scale-105 transform"
          >
            Back to Home
          </button>
        </div>
      </nav>

      {/* Login Section */}
      <section className="h-screen flex items-center justify-center px-8 relative overflow-hidden">
        {/* Background decorative elements */}
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

        <div className="w-[40%] mt-16 mx-auto text-center relative z-10">
          {/* Header */}
          <div className="mb-8">
            <h1 className="animate-fade-in-up text-[clamp(2rem,5vw,3rem)] font-extrabold mb-4 leading-tight tracking-tight">
              <span className="text-[var(--color-text-primary)] relative">
                Welcome Back
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-[var(--color-primary)]/30 to-transparent"></div>
              </span>
            </h1>
          </div>

          {/* Login Form */}
          <div className="animate-fade-in-up stagger-2 bg-gradient-to-br from-[var(--color-bg-card)] to-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-3xl p-6 mb-6">
            {/* Username Field */}
            <div className="mb-4 text-left">
              <label
                htmlFor="username"
                className="block text-[var(--color-text-primary)] font-semibold mb-2 text-left"
              >
                Username
              </label>
              <input
                type="text"
                id="username"
                placeholder="Enter your username"
                className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-xl px-4 py-3 text-lg transition-all duration-300 focus:border-[var(--color-primary)] focus:shadow-lg focus:shadow-[var(--color-primary)]/20 focus:outline-none focus:scale-[1.02]"
              />
            </div>

            {/* Login Button */}
            <div className="mb-4">
              <button className="group relative overflow-hidden w-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary)]/80 text-white px-8 py-3 rounded-xl font-bold text-lg hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-[var(--color-primary)]/30">
                <span className="relative z-10">Sign In</span>
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary)]/90 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </div>
          </div>

          {/* Additional Info */}
          <div className="animate-fade-in-up stagger-3">
            <p className="text-[var(--color-text-secondary)] text-base">
              Don{"'"}t have an account?{" "}
              <span className="text-[var(--color-primary)] cursor-pointer hover:underline font-semibold">
                <a href="/signup">Sign up here</a>
              </span>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
