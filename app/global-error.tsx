"use client";

export default function GlobalErrorPage() {
  return (
    <html lang="en">
      <body style={{ fontFamily: "sans-serif", background: "#f4f7fb", color: "#0b1f33", margin: 0 }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "2rem" }}>
          <div>
            <h1 style={{ fontSize: "1.5rem" }}>Something went wrong</h1>
            <p>Please refresh the page or try again later.</p>
          </div>
        </main>
      </body>
    </html>
  );
}
