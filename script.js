// ========================================
// 秘密小分队 - 公共 JavaScript 文件
// 服务于多个页面：index.html, map.html, user.html 等
// ========================================

(() => {
  // API 地址（用于消息提交功能，当前未使用）
  const API_URL = "/api/messages";

  // ========================================
  // 轮播图功能（index.html 专用）
  // 功能：合影照片自动轮播 + 手动切换
  // DOM: #carouselSlides, .carousel-container, #carouselIndicators
  // ========================================
  function initCarousel() {
    const slides = document.querySelectorAll('#carouselSlides .carousel-slide');
    const indicatorsContainer = document.getElementById('carouselIndicators');
    if (!slides.length || !indicatorsContainer) return;

    let currentIndex = 0;
    let autoplayInterval;
    let isTransitioning = false;
    const AUTOPLAY_DELAY = 6000; // 6 秒自动切换

    // 创建指示器（小圆点）
    slides.forEach((_, index) => {
      const indicator = document.createElement('div');
      indicator.className = 'carousel-indicator' + (index === 0 ? ' active' : '');
      indicator.addEventListener('click', () => {
        if (!isTransitioning) {
          goToSlide(index);
        }
      });
      indicatorsContainer.appendChild(indicator);
    });

    const indicators = document.querySelectorAll('.carousel-indicator');

    // 更新幻灯片显示状态
    function updateSlide() {
      if (isTransitioning) return;
      isTransitioning = true;
      
      slides.forEach((slide, index) => {
        slide.classList.remove('active');
        if (indicators[index]) {
          indicators[index].classList.remove('active');
        }
      });
      slides[currentIndex].classList.add('active');
      if (indicators[currentIndex]) {
        indicators[currentIndex].classList.add('active');
      }
      
      setTimeout(() => {
        isTransitioning = false;
      }, 500);
    }

    // 切换到指定幻灯片
    function goToSlide(index) {
      if (index === currentIndex) return;
      currentIndex = index;
      updateSlide();
      resetAutoplay();
    }

    // 切换到下一张
    function nextSlide() {
      currentIndex = (currentIndex + 1) % slides.length;
      updateSlide();
    }

    // 启动自动播放
    function startAutoplay() {
      stopAutoplay();
      autoplayInterval = setInterval(nextSlide, AUTOPLAY_DELAY);
    }

    // 停止自动播放
    function stopAutoplay() {
      if (autoplayInterval) {
        clearInterval(autoplayInterval);
        autoplayInterval = null;
      }
    }

    // 重置自动播放计时器
    function resetAutoplay() {
      startAutoplay();
    }

    // 鼠标悬停时暂停自动播放
    const container = document.querySelector('.carousel-container');
    if (container) {
      container.addEventListener('mouseenter', stopAutoplay);
      container.addEventListener('mouseleave', startAutoplay);
    }

    // 启动自动播放
    startAutoplay();
  }

  // ========================================
  // 工具函数：数值限制在指定范围内
  // 用途：地图缩放时限制缩放比例
  // ========================================
  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  // ========================================
  // 地图拖拽缩放功能（map.html 专用）
  // 功能：鼠标拖拽移动 + 滚轮缩放
  // DOM: #mapView, #mapInner
  // 初始状态：tx: -62.1816, ty: -89.5095, scale: 0.96173
  // 缩放范围：0.884792 - 9.0
  // ========================================
  function initMapDragZoom() {
    const mapView = document.getElementById("mapView");
    const mapInner = document.getElementById("mapInner");
    if (!mapView || !mapInner) return;

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let baseTx = 0;
    let baseTy = 0;

    // 地图状态：平移坐标 (tx, ty) 和缩放比例 (scale)
    const state = { tx: -62.1816, ty: -89.5095, scale: 0.96173 };

    let needsRender = false;

    // 应用变换到地图元素
    const applyTransform = () => {
      mapInner.style.transform = `translate(${state.tx}px, ${state.ty}px) scale(${state.scale})`;
    };

    // 请求渲染（使用 requestAnimationFrame 优化性能）
    const requestRender = () => {
      if (!needsRender) {
        needsRender = true;
        requestAnimationFrame(() => {
          applyTransform();
          needsRender = false;
        });
      }
    };

    // 指针按下事件 - 开始拖拽
    const onDown = (e) => {
      isDragging = true;
      mapView.setPointerCapture?.(e.pointerId);
      startX = e.clientX;
      startY = e.clientY;
      baseTx = state.tx;
      baseTy = state.ty;
      mapView.style.cursor = "grabbing";
    };

    // 指针移动事件 - 拖拽中
    const onMove = (e) => {
      if (!isDragging) return;
      state.tx = baseTx + (e.clientX - startX);
      state.ty = baseTy + (e.clientY - startY);
      requestRender();
    };

    // 指针释放事件 - 结束拖拽
    const onUp = () => {
      isDragging = false;
      mapView.style.cursor = "grab";
    };

    // 初始化鼠标样式
    mapView.style.cursor = "grab";

    // 使用 Pointer 事件兼容鼠标/触控
    mapView.addEventListener("pointerdown", onDown);
    mapView.addEventListener("pointermove", onMove);
    mapView.addEventListener("pointerup", onUp);
    mapView.addEventListener("pointercancel", onUp);

    // 滚轮缩放事件
    mapView.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();

        const rect = mapView.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92; // 向上滚动放大，向下滚动缩小
        const nextScale = clamp(state.scale * zoomFactor, 0.884792, 9.0);
        if (nextScale === state.scale) return;

        // 围绕鼠标位置进行缩放，减少"跳动感"
        const ratio = nextScale / state.scale;
        state.tx = (state.tx - mouseX) * ratio + mouseX;
        state.ty = (state.ty - mouseY) * ratio + mouseY;
        state.scale = nextScale;
        requestRender();
      },
      { passive: false }
    );

    // 应用初始变换
    applyTransform();
  }

  // ========================================
  // 用户卡片交互功能（user.html 专用）
  // 功能：
  //   1. 点击卡片标题展开/收起内容
  //   2. 点击皮肤图片触发"拍一拍"动画效果
  // DOM: .user-card, .user-card-header, .user-skin-image, .user-skin-patpat
  // ========================================
  function initUserCards() {
    const cards = document.querySelectorAll('.user-card');
    if (!cards || cards.length === 0) return;

    // 卡片展开/收起功能
    cards.forEach((card) => {
      const header = card.querySelector('.user-card-header');
      if (!header) return;

      header.addEventListener('click', () => {
        card.classList.toggle('collapsed');
      });
    });

    // pat 拍一拍动画功能
    const skinImages = document.querySelectorAll('.user-skin-image');
    skinImages.forEach((img) => {
      img.addEventListener('click', () => {
        if (img.classList.contains('patting')) return; // 防止重复触发
        
        img.classList.add('patting');
        
        // 显示 patpat 图标
        const patpat = img.nextElementSibling;
        if (patpat && patpat.classList.contains('user-skin-patpat')) {
          patpat.classList.add('show');
          
          setTimeout(() => {
            patpat.classList.remove('show');
          }, 1000);
        }
        
        // 一秒后移除动画类
        setTimeout(() => {
          img.classList.remove('patting');
        }, 1000);
      });
    });
  }

  // ========================================
  // 图片放大查看功能（Lightbox）
  // 适用于：.img-ph.img-ph-3, .wall-photo, .user-photo-item-img
  // 功能：点击图片全屏查看，再次点击或按 ESC 关闭
  // ========================================
  function initImageLightbox() {
    // 创建 lightbox 元素
    const lightbox = document.createElement('div');
    lightbox.className = 'image-lightbox';
    
    const closeBtn = document.createElement('div');
    closeBtn.className = 'image-lightbox-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.title = '关闭';
    
    const lightboxImg = document.createElement('img');
    lightboxImg.alt = '放大查看';
    
    lightbox.appendChild(closeBtn);
    lightbox.appendChild(lightboxImg);
    document.body.appendChild(lightbox);

    // 打开 lightbox
    function openLightbox(src) {
      lightboxImg.src = src;
      lightbox.classList.add('active');
      document.body.style.overflow = 'hidden'; // 禁止背景滚动
    }

    // 关闭 lightbox
    function closeLightbox() {
      lightbox.classList.remove('active');
      document.body.style.overflow = ''; // 恢复滚动
      setTimeout(() => {
        lightboxImg.src = '';
      }, 300);
    }

    // 获取所有需要支持放大的图片
    const clickableImages = document.querySelectorAll(
      '.img-ph.img-ph-3, .wall-photo, .user-photo-item-img'
    );

    // 为每张图片添加点击事件和样式
    clickableImages.forEach((img) => {
      img.classList.add('clickable');
      
      img.addEventListener('click', (e) => {
        e.stopPropagation();
        const src = img.src || img.getAttribute('src');
        if (src) {
          openLightbox(src);
        }
      });
    });

    // 点击背景或关闭按钮关闭
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox || e.target === closeBtn) {
        closeLightbox();
      }
    });

    // ESC 键关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lightbox.classList.contains('active')) {
        closeLightbox();
      }
    });
  }

  // ========================================
  // DOM 加载完成后初始化所有功能
  // 注意：已删除未使用的功能（initPlayerSelector, initPlayerDropdownHover, initMessage）
  // ========================================
  window.addEventListener("DOMContentLoaded", () => {
    initCarousel();         // 初始化轮播图（index.html）
    initMapDragZoom();      // 初始化地图拖拽（map.html）
    initUserCards();        // 初始化用户卡片（user.html）
    initImageLightbox();    // 初始化图片放大查看功能
  });
})();