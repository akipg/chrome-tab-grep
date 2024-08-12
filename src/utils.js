export function debounce(func, wait) {
    let timeout;
    let block = false;
    return function(...args) {
      if (block) {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          block = false;
          func.apply(this, args);
        }, wait);
      } else {
        clearTimeout(timeout);
        func.apply(this, args);
        block = true;
      }
    };
  }