const Logger = {
    enabled: true,
    maxLogs: 100,
    logContainer: null,
    
    output(...messages) {
      if (!this.enabled) return;
      
      if (!this.logContainer) {
        this._createLogContainer();
      }
      
      const timestamp = this._getTimestamp();
      const logElement = document.createElement('div');
      logElement.className = 'log-entry';
      logElement.textContent = `[${timestamp}] ${messages.join(' ')}`;
      
      this.logContainer.appendChild(logElement);
      
      const logs = this.logContainer.querySelectorAll('.log-entry');
      if (logs.length > this.maxLogs) {
        logs[0].remove();
      }
      
      this.logContainer.scrollTop = this.logContainer.scrollHeight;
    },
    
    _createLogContainer() {
      const styles = `
        #log-container {
          position: fixed;
          bottom: 10px;
          left: 10px;
          width: 300px;
          max-height: 200px;
          background: rgba(0, 0, 0, 0.9);
          border: 1px solid #333;
          border-radius: 8px;
          padding: 8px;
          font-family: 'Consolas', 'Monaco', monospace;
          font-size: 11px;
          color: #00ff00;
          overflow-y: auto;
          z-index: 99998;
          backdrop-filter: blur(4px);
          display: none;
        }
        
        #log-container.visible {
          display: block;
        }
        
        .log-entry {
          margin: 1px 0;
          word-wrap: break-word;
          opacity: 0.8;
        }
        
        .log-entry:hover {
          opacity: 1;
          background: rgba(255, 255, 255, 0.1);
        }
        
        #log-toggle {
          position: fixed;
          bottom: 10px;
          left: 320px;
          background: rgba(0, 0, 0, 0.7);
          color: #00ff00;
          border: 1px solid #333;
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 11px;
          cursor: pointer;
          z-index: 99999;
        }
        
        @media (max-width: 768px) {
          #log-container {
            width: 250px;
            max-height: 150px;
            font-size: 10px;
          }
          #log-toggle {
            left: 270px;
          }
        }
      `;
      
      const styleSheet = document.createElement("style");
      styleSheet.innerText = styles;
      document.head.appendChild(styleSheet);
      
      this.logContainer = document.createElement('div');
      this.logContainer.id = 'log-container';
      document.body.appendChild(this.logContainer);
      
      const toggleButton = document.createElement('button');
      toggleButton.id = 'log-toggle';
      toggleButton.textContent = '日志';
      toggleButton.addEventListener('click', () => {
        this.logContainer.classList.toggle('visible');
      });
      document.body.appendChild(toggleButton);
    },
    
    _getTimestamp() {
      const now = new Date();
      const time = now.toLocaleTimeString('zh-CN', { hour12: false });
      const ms = now.getMilliseconds().toString().padStart(3, '0');
      return `${time}.${ms}`;
    }
  };
  
  class UsageTracker {
    constructor() {
      this.storageKey = 'darkBrowserUsageStats';
      this.positionKey = 'darkBrowserPanelPosition';
      this.uiContainer = null;
      this.callsValueElement = null;
      this.tokensValueElement = null;
      this.isCollapsed = false;
  
      // 优化的拖拽状态
      this.isDragging = false;
      this.dragStartX = 0;
      this.dragStartY = 0;
      this.panelStartX = 0;
      this.panelStartY = 0;
      this.dragThreshold = 5; // 拖拽阈值，避免误触
      
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.init());
      } else {
        this.init();
      }
    }
  
    init() {
      this._createUI();
      this._initDraggable();
      this.loadStats();
    }
  
    _createUI() {
      const styles = `
        #usage-tracker-panel {
          position: fixed;
          background: linear-gradient(135deg, rgba(20, 20, 20, 0.95), rgba(40, 40, 40, 0.95));
          color: #e8e8e8;
          padding: 14px;
          border-radius: 12px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          z-index: 99999;
          box-shadow: 0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          width: 260px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          user-select: none;
          border: 1px solid rgba(255,255,255,0.1);
          cursor: move;
        }
        
        #usage-tracker-panel.collapsed {
          width: 120px;
          padding: 8px;
        }
        
        #usage-tracker-panel.dragging {
          box-shadow: 0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.3);
          transform: scale(1.05);
          transition: none;
          z-index: 100000;
        }
        
        .tracker-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          cursor: move;
        }
        
        .tracker-title {
          font-weight: 600;
          font-size: 14px;
          color: #ffffff;
          flex: 1;
          text-align: center;
          cursor: move;
          padding: 4px;
        }
        
        .tracker-controls {
          display: flex;
          gap: 4px;
        }
        
        .tracker-btn {
          background: rgba(255,255,255,0.1);
          color: #ffffff;
          border: none;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid rgba(255,255,255,0.1);
        }
        
        .tracker-btn:hover {
          background: rgba(255,255,255,0.2);
          transform: translateY(-1px);
        }
        
        .tracker-btn:active {
          transform: translateY(0);
        }
        
        .tracker-btn.collapse-btn {
          width: 20px;
          height: 20px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
        }
        
        .tracker-content {
          transition: all 0.3s ease;
          overflow: hidden;
        }
        
        .tracker-content.collapsed {
          max-height: 0;
          opacity: 0;
          margin: 0;
        }
        
        .tracker-grid {
          display: flex;
          justify-content: space-around;
          text-align: center;
          margin-bottom: 12px;
        }
        
        .tracker-item .tracker-label {
          font-size: 11px;
          color: #aaaaaa;
          margin-bottom: 4px;
          font-weight: 500;
        }
        
        .tracker-item .tracker-value {
          font-size: 18px;
          font-weight: 700;
          color: #64b5f6;
          word-wrap: break-word;
          text-shadow: 0 0 10px rgba(100, 181, 246, 0.3);
        }
        
        .tracker-buttons {
          display: flex;
          gap: 6px;
          justify-content: center;
          flex-wrap: wrap;
          margin-top: 8px;
        }
        
        .tracker-btn.action-btn {
          background: linear-gradient(135deg, #4fc3f7, #29b6f6);
          color: white;
          padding: 6px 12px;
          font-size: 11px;
          font-weight: 500;
          border-radius: 8px;
          border: none;
          box-shadow: 0 2px 8px rgba(79, 195, 247, 0.3);
          cursor: pointer;
        }
        
        .tracker-btn.action-btn:hover {
          background: linear-gradient(135deg, #29b6f6, #0288d1);
          box-shadow: 0 4px 12px rgba(79, 195, 247, 0.4);
        }
        
        .tracker-btn.export-btn {
          background: linear-gradient(135deg, #66bb6a, #43a047);
        }
        
        .tracker-btn.export-btn:hover {
          background: linear-gradient(135deg, #43a047, #2e7d32);
        }
        
        .tracker-btn.import-btn {
          background: linear-gradient(135deg, #ff7043, #f4511e);
        }
        
        .tracker-btn.import-btn:hover {
          background: linear-gradient(135deg, #f4511e, #d84315);
        }
        
        .tracker-btn.clear-btn {
          background: linear-gradient(135deg, #ef5350, #e53935);
        }
        
        .tracker-btn.clear-btn:hover {
          background: linear-gradient(135deg, #e53935, #c62828);
        }
        
        #import-file {
          display: none;
        }
        
        .notification {
          position: fixed;
          top: 20px;
          right: 20px;
          background: rgba(0, 0, 0, 0.9);
          color: white;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 12px;
          z-index: 100000;
          opacity: 0;
          transform: translateY(-20px);
          transition: all 0.3s ease;
        }
        
        .notification.show {
          opacity: 1;
          transform: translateY(0);
        }
        
        .notification.success {
          border-left: 4px solid #4caf50;
        }
        
        .notification.error {
          border-left: 4px solid #f44336;
        }
        
        @media (max-width: 768px) {
          #usage-tracker-panel {
            width: 220px;
            padding: 10px;
          }
          
          #usage-tracker-panel.collapsed {
            width: 100px;
          }
          
          .tracker-title {
            font-size: 12px;
          }
          
          .tracker-item .tracker-label {
            font-size: 10px;
          }
          
          .tracker-item .tracker-value {
            font-size: 16px;
          }
          
          .tracker-btn.action-btn {
            padding: 5px 8px;
            font-size: 10px;
          }
        }
        
        @media (max-width: 480px) {
          #usage-tracker-panel {
            width: 180px;
            padding: 8px;
          }
          
          .tracker-buttons {
            gap: 4px;
          }
          
          .tracker-btn.action-btn {
            padding: 4px 6px;
            font-size: 9px;
          }
        }
      `;
      
      const styleSheet = document.createElement("style");
      styleSheet.innerText = styles;
      document.head.appendChild(styleSheet);
  
      this.uiContainer = document.createElement('div');
      this.uiContainer.id = 'usage-tracker-panel';
      
      this.uiContainer.innerHTML = `
        <div class="tracker-header">
          <div class="tracker-title">今日用量 (PT)</div>
          <div class="tracker-controls">
            <button class="tracker-btn collapse-btn" id="collapse-btn" title="折叠/展开">−</button>
          </div>
        </div>
        <div class="tracker-content" id="tracker-content">
          <div class="tracker-grid">
            <div class="tracker-item">
              <div class="tracker-label">调用次数</div>
              <div class="tracker-value" id="tracker-calls-value">0</div>
            </div>
            <div class="tracker-item">
              <div class="tracker-label">Token 消耗</div>
              <div class="tracker-value" id="tracker-tokens-value">0</div>
            </div>
          </div>
          <div class="tracker-buttons">
            <button class="tracker-btn action-btn export-btn" id="export-btn">导出</button>
            <button class="tracker-btn action-btn import-btn" id="import-btn">导入</button>
            <button class="tracker-btn action-btn clear-btn" id="clear-btn">清零</button>
          </div>
        </div>
        <input type="file" id="import-file" accept=".json">
      `;
      
      document.body.appendChild(this.uiContainer);
  
      this.callsValueElement = document.getElementById('tracker-calls-value');
      this.tokensValueElement = document.getElementById('tracker-tokens-value');
      
      this._initEventListeners();
    }
    
    _initEventListeners() {
      document.getElementById('collapse-btn').addEventListener('click', (e) => {
        e.stopPropagation(); // 防止触发拖拽
        this.isCollapsed = !this.isCollapsed;
        const content = document.getElementById('tracker-content');
        const collapseBtn = document.getElementById('collapse-btn');
        
        if (this.isCollapsed) {
          this.uiContainer.classList.add('collapsed');
          content.classList.add('collapsed');
          collapseBtn.textContent = '+';
          collapseBtn.title = '展开';
        } else {
          this.uiContainer.classList.remove('collapsed');
          content.classList.remove('collapsed');
          collapseBtn.textContent = '−';
          collapseBtn.title = '折叠';
        }
      });
      
      document.getElementById('export-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.exportStats();
      });
      
      document.getElementById('import-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('import-file').click();
      });
      
      document.getElementById('import-file').addEventListener('change', (e) => {
        if (e.target.files[0]) {
          this.importStats(e.target.files[0]);
        }
      });
      
      document.getElementById('clear-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('确定要清零今日统计数据吗？此操作不可恢复。')) {
          this.clearStats();
        }
      });
    }
    
    _initDraggable() {
      // 优化的拖拽实现
      const onPointerDown = (e) => {
        // 如果点击的是按钮，不启动拖拽
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
          return;
        }
        
        this.isDragging = false; // 初始不是拖拽状态
        this.dragStartX = e.clientX || e.touches[0].clientX;
        this.dragStartY = e.clientY || e.touches[0].clientY;
        this.panelStartX = this.uiContainer.offsetLeft;
        this.panelStartY = this.uiContainer.offsetTop;
        
        document.addEventListener('mousemove', onPointerMove, { passive: false });
        document.addEventListener('mouseup', onPointerUp);
        document.addEventListener('touchmove', onPointerMove, { passive: false });
        document.addEventListener('touchend', onPointerUp);
        
        e.preventDefault();
      };
  
      const onPointerMove = (e) => {
        const currentX = e.clientX || e.touches[0].clientX;
        const currentY = e.clientY || e.touches[0].clientY;
        
        const deltaX = currentX - this.dragStartX;
        const deltaY = currentY - this.dragStartY;
        
        // 只有移动距离超过阈值才开始拖拽
        if (!this.isDragging && (Math.abs(deltaX) > this.dragThreshold || Math.abs(deltaY) > this.dragThreshold)) {
          this.isDragging = true;
          this.uiContainer.classList.add('dragging');
        }
        
        if (this.isDragging) {
          let newX = this.panelStartX + deltaX;
          let newY = this.panelStartY + deltaY;
          
          // 更宽松的边界限制，允许部分超出屏幕
          const margin = 50; // 允许50px超出边界
          const maxX = window.innerWidth - margin;
          const maxY = window.innerHeight - margin;
          const minX = -this.uiContainer.offsetWidth + margin;
          const minY = -margin;
          
          newX = Math.max(minX, Math.min(newX, maxX));
          newY = Math.max(minY, Math.min(newY, maxY));
          
          this.uiContainer.style.left = `${newX}px`;
          this.uiContainer.style.top = `${newY}px`;
          this.uiContainer.style.right = 'auto';
          this.uiContainer.style.bottom = 'auto';
          
          e.preventDefault();
        }
      };
  
      const onPointerUp = () => {
        if (this.isDragging) {
          this.uiContainer.classList.remove('dragging');
          this._savePosition();
        }
        
        this.isDragging = false;
        
        document.removeEventListener('mousemove', onPointerMove);
        document.removeEventListener('mouseup', onPointerUp);
        document.removeEventListener('touchmove', onPointerMove);
        document.removeEventListener('touchend', onPointerUp);
      };
  
      // 绑定事件到整个面板
      this.uiContainer.addEventListener('mousedown', onPointerDown);
      this.uiContainer.addEventListener('touchstart', onPointerDown, { passive: false });
    }
  
    _getTodayPST() {
      return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
    }
  
    loadStats() {
      try {
        const pos = JSON.parse(localStorage.getItem(this.positionKey));
        if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
          this.uiContainer.style.top = `${pos.y}px`;
          this.uiContainer.style.left = `${pos.x}px`;
          this.uiContainer.style.right = 'auto';
          this.uiContainer.style.bottom = 'auto';
        } else {
          this.uiContainer.style.top = '15px';
          this.uiContainer.style.right = '15px';
        }
      } catch (e) { }
  
      const todayPST = this._getTodayPST();
      let stats = { date: todayPST, calls: 0, tokens: 0 };
      try {
        const storedStats = JSON.parse(localStorage.getItem(this.storageKey));
        if (storedStats && storedStats.date === todayPST) {
          stats = storedStats;
        } else {
          this._saveStats(stats);
        }
      } catch (error) {
        Logger.output('[UsageTracker] 读取本地存储失败', error);
        this._saveStats(stats);
      }
      this._updateUI(stats);
      return stats;
    }
    
    _saveStats(stats) {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(stats));
      } catch (error) {
        Logger.output('[UsageTracker] 保存统计数据失败', error);
      }
    }
  
    _savePosition() {
      try {
        const pos = { x: this.uiContainer.offsetLeft, y: this.uiContainer.offsetTop };
        localStorage.setItem(this.positionKey, JSON.stringify(pos));
      } catch (error) {
        Logger.output('[UsageTracker] 保存面板位置失败', error);
      }
    }
  
    _updateUI(stats) {
      if (this.callsValueElement && this.tokensValueElement) {
        this.callsValueElement.textContent = stats.calls.toLocaleString('en-US');
        this.tokensValueElement.textContent = stats.tokens.toLocaleString('en-US');
      }
    }
    
    _showNotification(message, type = 'success') {
      const notification = document.createElement('div');
      notification.className = `notification ${type}`;
      notification.textContent = message;
      document.body.appendChild(notification);
      
      setTimeout(() => notification.classList.add('show'), 100);
      
      setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => document.body.removeChild(notification), 300);
      }, 3000);
    }
  
    exportStats() {
      try {
        const stats = localStorage.getItem(this.storageKey);
        const position = localStorage.getItem(this.positionKey);
        
        const exportData = {
          usageStats: JSON.parse(stats || '{}'),
          panelPosition: JSON.parse(position || '{}'),
          exportDate: new Date().toISOString(),
          version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], 
          { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `ai-usage-stats-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        this._showNotification('统计数据已导出', 'success');
        Logger.output('[UsageTracker] 统计数据已导出');
      } catch (error) {
        this._showNotification('导出失败', 'error');
        Logger.output('[UsageTracker] 导出失败:', error);
      }
    }
  
    importStats(file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importData = JSON.parse(e.target.result);
          
          if (importData.usageStats) {
            localStorage.setItem(this.storageKey, JSON.stringify(importData.usageStats));
          }
          if (importData.panelPosition) {
            localStorage.setItem(this.positionKey, JSON.stringify(importData.panelPosition));
          }
          
          this.loadStats();
          this._showNotification('统计数据已导入', 'success');
          Logger.output('[UsageTracker] 统计数据已导入');
        } catch (error) {
          this._showNotification('导入失败，文件格式错误', 'error');
          Logger.output('[UsageTracker] 导入失败:', error);
        }
      };
      
      reader.onerror = () => {
        this._showNotification('文件读取失败', 'error');
        Logger.output('[UsageTracker] 文件读取失败');
      };
      
      reader.readAsText(file);
    }
    
    clearStats() {
      try {
        const todayPST = this._getTodayPST();
        const stats = { date: todayPST, calls: 0, tokens: 0 };
        this._saveStats(stats);
        this._updateUI(stats);
        this._showNotification('统计数据已清零', 'success');
        Logger.output('[UsageTracker] 统计数据已清零');
      } catch (error) {
        this._showNotification('清零失败', 'error');
        Logger.output('[UsageTracker] 清零失败:', error);
      }
    }
  
    recordApiCall(responseBody = '') {
      const stats = this.loadStats();
      stats.calls += 1;
      if (responseBody) {
        try {
          const data = JSON.parse(responseBody);
          const tokenCount = data?.usageMetadata?.totalTokenCount;
          if (typeof tokenCount === 'number') {
            stats.tokens += tokenCount;
            Logger.output(`[UsageTracker] 本次消耗Token: ${tokenCount}, 今日累计: ${stats.tokens}`);
          }
        } catch (e) {
          Logger.output('[UsageTracker] 无法从响应体解析Token。');
        }
      }
      this._saveStats(stats);
      this._updateUI(stats);
    }
  }
  
  class ConnectionManager extends EventTarget {
    constructor(endpoint = 'ws://127.0.0.1:9998') {
      super();
      this.endpoint = endpoint;
      this.socket = null;
      this.isConnected = false;
      this.reconnectDelay = 5000;
      this.maxReconnectAttempts = Infinity;
      this.reconnectAttempts = 0;
    }
    
    async establish() {
      if (this.isConnected) {
        Logger.output('[ConnectionManager] 连接已存在');
        return Promise.resolve();
      }
      
      Logger.output('[ConnectionManager] 建立连接:', this.endpoint);
      
      return new Promise((resolve, reject) => {
        this.socket = new WebSocket(this.endpoint);
        
        this.socket.addEventListener('open', () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          Logger.output('[ConnectionManager] 连接建立成功');
          this.dispatchEvent(new CustomEvent('connected'));
          resolve();
        });
        
        this.socket.addEventListener('close', () => {
          this.isConnected = false;
          Logger.output('[ConnectionManager] 连接断开，准备重连');
          this.dispatchEvent(new CustomEvent('disconnected'));
          this._scheduleReconnect();
        });
        
        this.socket.addEventListener('error', (error) => {
          Logger.output('[ConnectionManager] 连接错误:', error);
          this.dispatchEvent(new CustomEvent('error', { detail: error }));
          if (!this.isConnected) reject(error);
        });
        
        this.socket.addEventListener('message', (event) => {
          this.dispatchEvent(new CustomEvent('message', { detail: event.data }));
        });
      });
    }
    
    transmit(data) {
      if (!this.isConnected || !this.socket) {
        Logger.output('[ConnectionManager] 无法发送数据：连接未建立');
        return false;
      }
      
      this.socket.send(JSON.stringify(data));
      return true;
    }
    
    _scheduleReconnect() {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        Logger.output('[ConnectionManager] 达到最大重连次数');
        return;
      }
      
      this.reconnectAttempts++;
      setTimeout(() => {
        Logger.output(`[ConnectionManager] 重连尝试 ${this.reconnectAttempts}`);
        this.establish().catch(() => {});
      }, this.reconnectDelay);
    }
  }
  
  class RequestProcessor {
    constructor() {
      this.activeOperations = new Map();
      this.targetDomain = 'generativelanguage.googleapis.com';
    }
    
    async execute(requestSpec, operationId) {
      Logger.output('[RequestProcessor] 执行请求:', requestSpec.method, requestSpec.path);
      
      try {
        const abortController = new AbortController();
        this.activeOperations.set(operationId, abortController);
        
        const requestUrl = this._constructUrl(requestSpec);
        Logger.output(`[RequestProcessor] 构造的最终请求URL: ${requestUrl}`);
        const requestConfig = this._buildRequestConfig(requestSpec, abortController.signal);
        
        const response = await fetch(requestUrl, requestConfig);
        
        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`HTTP ${response.status}: ${response.statusText}. Body: ${errorBody}`);
        }
        
        return response;
      } catch (error) {
        Logger.output('[RequestProcessor] 请求执行失败:', error.message);
        throw error;
      } finally {
        this.activeOperations.delete(operationId);
      }
    }
    
    cancelOperation(operationId) {
      const controller = this.activeOperations.get(operationId);
      if (controller) {
        controller.abort();
        this.activeOperations.delete(operationId);
        Logger.output('[RequestProcessor] 操作已取消:', operationId);
      }
    }
    
    cancelAllOperations() {
      this.activeOperations.forEach((controller, id) => {
        controller.abort();
        Logger.output('[RequestProcessor] 取消操作:', id);
      });
      this.activeOperations.clear();
    }
    
    _constructUrl(requestSpec) {
      let pathSegment = requestSpec.path.startsWith('/') ? 
        requestSpec.path.substring(1) : requestSpec.path;
      
      const queryParams = new URLSearchParams(requestSpec.query_params);
  
      if (requestSpec.streaming_mode === 'fake') {
        Logger.output('[RequestProcessor] 假流式模式激活，正在尝试将请求修改为非流式。');
        
        if (pathSegment.includes(':streamGenerateContent')) {
          pathSegment = pathSegment.replace(':streamGenerateContent', ':generateContent');
          Logger.output(`[RequestProcessor] API路径已修改为: ${pathSegment}`);
        }
        
        if (queryParams.has('alt') && queryParams.get('alt') === 'sse') {
          queryParams.delete('alt');
          Logger.output('[RequestProcessor] 已移除 "alt=sse" 查询参数。');
        }
      }
      
      const queryString = queryParams.toString();
      
      return `https://${this.targetDomain}/${pathSegment}${queryString ? '?' + queryString : ''}`;
    }
    
    _generateRandomString(length) {
      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    }
  
    _buildRequestConfig(requestSpec, signal) {
      const config = {
        method: requestSpec.method,
        headers: this._sanitizeHeaders(requestSpec.headers),
        signal
      };
      
      if (['POST', 'PUT', 'PATCH'].includes(requestSpec.method) && requestSpec.body) {
        try {
          const bodyObj = JSON.parse(requestSpec.body);
          
          if (bodyObj.contents && Array.isArray(bodyObj.contents) && bodyObj.contents.length > 0) {
            const lastContent = bodyObj.contents[bodyObj.contents.length - 1];
            if (lastContent.parts && Array.isArray(lastContent.parts) && lastContent.parts.length > 0) {
              const lastPart = lastContent.parts[lastContent.parts.length - 1];
              if (lastPart.text && typeof lastPart.text === 'string') {
                const decoyString = this._generateRandomString(5);
                lastPart.text += `\n\n[sig:${decoyString}]`; 
                Logger.output('[RequestProcessor] 已成功向提示文本末尾添加伪装字符串。');
              }
            }
          }
          
          config.body = JSON.stringify(bodyObj);
  
        } catch (e) {
          Logger.output('[RequestProcessor] 请求体不是JSON，按原样发送。');
          config.body = requestSpec.body;
        }
      }
      
      return config;
    }
    
    _sanitizeHeaders(headers) {
      const sanitized = { ...headers };
      const forbiddenHeaders = [
        'host', 'connection', 'content-length', 'origin',
        'referer', 'user-agent', 'sec-fetch-mode',
        'sec-fetch-site', 'sec-fetch-dest'
      ];
      
      forbiddenHeaders.forEach(header => delete sanitized[header]);
      return sanitized;
    }
  }
  
  class ProxySystem extends EventTarget {
    constructor(websocketEndpoint) {
      super();
      this.connectionManager = new ConnectionManager(websocketEndpoint);
      this.requestProcessor = new RequestProcessor();
      this._setupEventHandlers();
    }
    
    async initialize() {
      Logger.output('[ProxySystem] 系统初始化中...');
      try {
        await this.connectionManager.establish();
        Logger.output('[ProxySystem] 系统初始化完成');
        this.dispatchEvent(new CustomEvent('ready'));
      } catch (error) {
        Logger.output('[ProxySystem] 系统初始化失败:', error.message);
        this.dispatchEvent(new CustomEvent('error', { detail: error }));
        throw error;
      }
    }
    
    _setupEventHandlers() {
      this.connectionManager.addEventListener('message', (event) => {
        this._handleIncomingMessage(event.detail);
      });
      
      this.connectionManager.addEventListener('disconnected', () => {
        this.requestProcessor.cancelAllOperations();
      });
    }
    
    async _handleIncomingMessage(messageData) {
      let requestSpec = {};
      try {
        requestSpec = JSON.parse(messageData);
        Logger.output('[ProxySystem] 收到请求:', requestSpec.method, requestSpec.path);
        Logger.output(`[ProxySystem] 服务器模式为: ${requestSpec.streaming_mode || 'fake'}`);
        
        await this._processProxyRequest(requestSpec);
      } catch (error) {
        Logger.output('[ProxySystem] 消息处理错误:', error.message);
        const operationId = requestSpec.request_id;
        this._sendErrorResponse(error, operationId);
      }
    }
    
    async _processProxyRequest(requestSpec) {
      const operationId = requestSpec.request_id;
      const mode = requestSpec.streaming_mode || 'fake';
  
      try {
        const response = await this.requestProcessor.execute(requestSpec, operationId);
        this._transmitHeaders(response, operationId);
  
        if (mode === 'real') {
          Logger.output('[ProxySystem] 以真流式模式处理响应 (逐块读取)...');
          usageTracker.recordApiCall(); 
          
          const reader = response.body.getReader();
          const textDecoder = new TextDecoder();
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              Logger.output('[ProxySystem] 真流式读取完成。');
              break;
            }
            const textChunk = textDecoder.decode(value, { stream: true });
            this._transmitChunk(textChunk, operationId);
          }
        } else {
          Logger.output('[ProxySystem] 以假流式模式处理响应 (一次性读取)...');
          const fullBody = await response.text();
          Logger.output('[ProxySystem] 已获取完整响应体，长度:', fullBody.length);
          
          usageTracker.recordApiCall(fullBody);
  
          this._transmitChunk(fullBody, operationId);
        }
  
        this._transmitStreamEnd(operationId);
  
      } catch (error) {
        if (error.name === 'AbortError') {
          Logger.output('[ProxySystem] 请求被中止');
        } else {
          this._sendErrorResponse(error, operationId);
        }
      }
    }
    
    _transmitHeaders(response, operationId) {
      const headerMap = {};
      response.headers.forEach((value, key) => {
        headerMap[key] = value;
      });
      
      const headerMessage = {
        request_id: operationId,
        event_type: 'response_headers',
        status: response.status,
        headers: headerMap
      };
      
      this.connectionManager.transmit(headerMessage);
      Logger.output('[ProxySystem] 响应头已传输');
    }
  
    _transmitChunk(chunk, operationId) {
      if (!chunk) return;
      const chunkMessage = {
        request_id: operationId,
        event_type: 'chunk',
        data: chunk
      };
      this.connectionManager.transmit(chunkMessage);
    }
  
    _transmitStreamEnd(operationId) {
      const endMessage = {
        request_id: operationId,
        event_type: 'stream_close'
      };
      this.connectionManager.transmit(endMessage);
      Logger.output('[ProxySystem] 流结束信号已传输');
    }
    
    _sendErrorResponse(error, operationId) {
      if (!operationId) {
        Logger.output('[ProxySystem] 无法发送错误响应：缺少操作ID');
        return;
      }
      
      const errorMessage = {
        request_id: operationId,
        event_type: 'error',
        status: 500,
        message: `代理系统错误: ${error.message || '未知错误'}`
      };
      
      this.connectionManager.transmit(errorMessage);
      Logger.output('[ProxySystem] 错误响应已发送');
    }
  }
  
  const usageTracker = new UsageTracker();
  
  async function initializeProxySystem() {
    const proxySystem = new ProxySystem();
    
    try {
      await proxySystem.initialize();
      console.log('浏览器代理系统已成功启动');
    } catch (error) {
      console.error('代理系统启动失败:', error);
    }
  }
  
  if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeProxySystem);
  } else {
      initializeProxySystem();
  }