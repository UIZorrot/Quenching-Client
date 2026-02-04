/**
 * Cookie工具方法
 *
 * @format
 */

const Cookie = {
  /**
   * get
   *
   * @description 获取cookie
   *
   * @param {string} key - 目标cookie的key
   * @param {Function} [decode] - value解码方法 默认使用 decodeURIComponent 进行解码
   * @returns {string}
   *
   * @example
   *
   *    Cookie.get('test')
   */
  get(key, decode = decodeURIComponent) {
    let value;
    if (key && document.cookie && document.cookie !== '') {
      let cookies = document.cookie.split('; ');
      for (let i = 0; i < cookies.length; i++) {
        let parts = cookies[i].split('=');
        let cookie = parts.slice(1).join('=');
        let name = decode(parts[0]);

        //去掉多余的 "
        if (cookie.indexOf('"') === 0) {
          cookie = cookie.slice(1, -1);
        }

        if (key === name) {
          value = decode(cookie);
          break;
        }
      }
    }
    return value;
  },

  /**
   * set
   *
   * @description 设置cookie
   *
   * @param {string} key - cookie 的 key
   * @param {string|number|object} value - cookie 的 value
   * @param {object} options - 例：{ expires: 0, path: null, secure: true, domain: 'd.2dfire.com' }<br>
   * expires: 过期时间默认单位是天，如果需要设置小于一天的过期时间，可以直接转入具体的Date对象;<br>
   * path: 例如 '/', '/mydir'; 如果没有定义，默认为当前文档位置的路径;<br>
   * secure: cookie只会被https传输 (boolean | null);<br>
   * domain: 例：'d.2dfire.com'；如果没有定义，默认为当前文档位置的路径的域名部分 (string | null)。
   *
   * @returns {string}
   *
   * @example
   *
   *    Cookie.set('test', 'xxx', { expires: 0, path: null, secure: true, domain: 'd.2dfire.com' })
   *
   */
  set(key, value, options) {
    options = Object.assign(
      {},
      {
        encode: encodeURIComponent,
        expires: 365,
        path: '/',
        secure: window.hash.protocol === 'https:',
      },
      options,
    );

    let expires = options.expires;
    //过期时间默认单位是天，如果需要设置小于一天的过期时间，可以直接转入具体的Date对象
    if (typeof expires === 'number' && expires !== 0 && isFinite(expires)) {
      expires = new Date(new Date().getTime() + expires * 864e5);
    }
    //格式化value
    if (typeof value === 'object') {
      try {
        value = JSON.stringify(value);
      } catch (e) {}
    }
    //编码key、value，默认使用encodeURIComponent方法，如需其他编码方式可以传入encode覆盖默认方法
    key = options.encode(key);
    value = options.encode(value);

    return (document.cookie = [
      key + '=' + value,
      expires ? '; expires=' + expires.toUTCString() : '',
      options.path ? '; path=' + options.path : '',
      options.domain ? '; domain=' + options.domain : '',
      options.secure ? '; secure' : '',
    ].join(''));
  },

  /**
   * remove
   *
   * @description 移除cookie
   *
   * @param {string} key - cookie 的 key
   * @returns {boolean}
   *
   * @example
   *
   *  Cookie.remove('test')
   */
  remove(key) {
    this.set(key, '', {
      expires: -1,
    });
    return !this.get(key);
  },

  hasItem: function (sKey) {
    return new RegExp('(?:|;s*)' + encodeURIComponent(sKey).replace(/[-.+]/g, '$&') + 's=').test(document.cookie);
  },
};

export default Cookie;
