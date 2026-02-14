/**
 * LP Template - JavaScript
 *
 * data-cv属性を持つ要素は自動でコンバージョン追跡されます
 * ビルド時にコンバージョンコードが自動挿入されます
 */

document.addEventListener('DOMContentLoaded', function() {
  // スムーズスクロール
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href === '#') return;

      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
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
          } else if (currentScrollY > lastScrollY) {
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
  }

  // FAQアコーディオン（details要素を使用している場合は不要）
  // カスタムアコーディオンが必要な場合はここに追加

  // フォームバリデーション（フォームがある場合）
  const forms = document.querySelectorAll('form[data-validate]');
  forms.forEach(form => {
    form.addEventListener('submit', function(e) {
      let isValid = true;
      const requiredFields = form.querySelectorAll('[required]');

      requiredFields.forEach(field => {
        if (!field.value.trim()) {
          isValid = false;
          field.classList.add('error');
        } else {
          field.classList.remove('error');
        }
      });

      if (!isValid) {
        e.preventDefault();
      }
    });
  });
});

/**
 * コンバージョン追跡用のプレースホルダー
 * ビルド時に実際のコードに置き換えられます
 */
// __CONVERSION_CODE_PLACEHOLDER__
