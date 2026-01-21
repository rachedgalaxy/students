export default {
    /**
     * @param {Request} request
     * @param {any} env
     * @param {any} ctx
     * @returns {Promise<Response>}
     */
    async fetch(request, env, ctx) {
      const url = new URL(request.url);
  
      // 1. Better Performance: Bypass Worker completely for static assets.
      // These extensions will directly hit the CDN/Asset cache without invoking this function logic (if configured in routes, but good as a code check).
      if (url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|map|json)$/)) {
        return fetch(request);
      }
  
      // 2. Only apply logic to HTML requests (Navigation).
      // API calls or other resources should pass through normally unless we want global headers.
      const accept = request.headers.get("Accept") || "";
      if (!accept.includes("text/html")) {
        return fetch(request);
      }
  
      // 3. Smart Caching Strategy
      const cache = caches.default;
      const cacheKey = new Request(url.toString(), request);
  
      // Check cache first
      let response = await cache.match(cacheKey);
      if (response) {
        return response;
      }
  
      // Fetch from origin (the static site)
      response = await fetch(request);
  
      // 4. Security Headers Injection
      // We clone the headers to make them mutable
      const newHeaders = new Headers(response.headers);
      
      // Prevent Clickjacking
      newHeaders.set("X-Frame-Options", "SAMEORIGIN");
      
      // Prevent MIME-sniffing
      newHeaders.set("X-Content-Type-Options", "nosniff");
      
      // Privacy: Don't leak referrer data on cross-origin requests
      newHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");
      
      // Disable powerful features not used by the app
      newHeaders.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
      
      // HSTS: Enforce HTTPS (1 year)
      newHeaders.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  
      // CSP: Balanced for functionality and security.
      // Allows: 
      // - 'self': Own domain
      // - https: Secure external resources (images, fonts, APIs)
      // - data:/blob: Common in modern web apps (React, images)
      // - 'unsafe-inline': Required for many CSS-in-JS libraries and simple scripts
      // - 'unsafe-eval': Required for some dev tools or specific libraries (can be removed for strict production)
      newHeaders.set(
        "Content-Security-Policy",
        "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'self'; upgrade-insecure-requests;"
      );
  
      // 5. Cache & Return
      // Cache the response with the new headers for 1 hour (3600s)
      newHeaders.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
      newHeaders.set("X-Worker-Debug", "Active"); // Marker to prove worker is running
  
      const newResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
  
      // Save to Cloudflare Cache
      ctx.waitUntil(cache.put(cacheKey, newResponse.clone()));
  
      return newResponse;
    },
  };
  
