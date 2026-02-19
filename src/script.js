/**
 * 買取大吉 山科音羽店 LP - JavaScript
 *
 * data-cv属性を持つ要素は自動でコンバージョン追跡されます
 * ビルド時にコンバージョンコードが自動挿入されます
 */

document.addEventListener('DOMContentLoaded', function() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.documentElement.classList.remove('no-js');
  document.documentElement.classList.add('js');

  // スムーズスクロール
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href === '#') return;

      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;

        window.scrollTo({
          top: targetPosition,
          behavior: prefersReducedMotion ? 'auto' : 'smooth'
        });
      }
    });
  });

  // ヘッダーのスクロール表示/非表示
  const header = document.querySelector('.header');
  if (header) {
    let lastScrollY = 0;
    let ticking = false;

    window.addEventListener('scroll', function() {
      if (!ticking) {
        window.requestAnimationFrame(function() {
          const currentScrollY = window.scrollY;

          if (currentScrollY <= 50) {
            header.style.transform = 'translateY(0)';
          } else if (currentScrollY > lastScrollY && currentScrollY > 200) {
            header.style.transform = 'translateY(-100%)';
          } else {
            header.style.transform = 'translateY(0)';
          }

          lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    });

    header.style.transition = 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)';
  }

  // アニメーション対象の要素を監視
  const animatedElements = document.querySelectorAll(
    '.empathy-item, .proposal-item, .items-card, .line-step-card, .visit-item, .values-item, .closing-scenario'
  );

  // CSS --stagger カスタムプロパティをセット
  animatedElements.forEach(el => {
    const index = Array.from(el.parentElement?.children || []).indexOf(el);
    el.style.setProperty('--stagger', index);
  });

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    animatedElements.forEach(el => {
      el.classList.add('is-visible');
    });
  } else {
    // スクロールアニメーション（Intersection Observer）
    const observerOptions = {
      root: null,
      rootMargin: '0px 0px -80px 0px',
      threshold: 0.15
    };

    const animateOnScroll = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          animateOnScroll.unobserve(entry.target);
        }
      });
    }, observerOptions);

    animatedElements.forEach(el => {
      animateOnScroll.observe(el);
    });
  }

  // Sticky CTA bar - show when hero scrolls out of view (mobile only)
  const heroSection = document.querySelector('.hero');
  const stickyCta = document.querySelector('.sticky-cta');

  if (heroSection && stickyCta && 'IntersectionObserver' in window) {
    const stickyObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          stickyCta.classList.remove('is-visible');
          stickyCta.setAttribute('aria-hidden', 'true');
        } else {
          stickyCta.classList.add('is-visible');
          stickyCta.setAttribute('aria-hidden', 'false');
        }
      });
    }, { threshold: 0 });

    stickyObserver.observe(heroSection);
  }

  // Pulse animation on hero CTA - trigger 1.5s after load
  if (!prefersReducedMotion) {
    const heroCtaBtn = document.querySelector('.hero-cta-btn');
    if (heroCtaBtn) {
      setTimeout(() => {
        heroCtaBtn.classList.add('is-pulsing');
      }, 2000);
    }
  }

  // CTAボタンのクリックトラッキング（data-cv属性）
  const trackableElements = document.querySelectorAll('[data-cv]');
  trackableElements.forEach(el => {
    el.addEventListener('click', function() {
      const cvType = this.getAttribute('data-cv');

      // Google Analytics イベント送信（gtag が存在する場合）
      if (typeof gtag === 'function') {
        gtag('event', 'click', {
          'event_category': 'CTA',
          'event_label': cvType
        });
      }

      // カスタムイベントを発火（他のトラッキングツール用）
      window.dispatchEvent(new CustomEvent('cv-click', {
        detail: { type: cvType, element: this }
      }));
    });
  });

  // 電話番号リンクのモバイル対応
  const telLinks = document.querySelectorAll('a[href^="tel:"]');
  telLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      // デスクトップでは電話リンクを無効化（任意）
      if (window.innerWidth > 768) {
        // 電話番号をクリップボードにコピー
        const phoneNumber = this.getAttribute('href').replace('tel:', '');
        const canCopy = window.isSecureContext && navigator.clipboard && navigator.clipboard.writeText;
        if (canCopy) {
          e.preventDefault();
          navigator.clipboard.writeText(phoneNumber)
            .then(() => {
              // 簡易的な通知（必要に応じてカスタマイズ）
              const originalText = this.textContent;
              this.textContent = 'コピーしました';
              setTimeout(() => {
                this.textContent = originalText;
              }, 2000);
            })
            .catch(() => {
              window.location.href = this.getAttribute('href');
            });
        }
      }
    });
  });
});

/**
 * コンバージョン追跡用のプレースホルダー
 * ビルド時に実際のコードに置き換えられます
 */
// __CONVERSION_CODE_PLACEHOLDER__
