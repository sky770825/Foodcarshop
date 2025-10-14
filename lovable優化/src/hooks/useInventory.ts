/**
 * 🪝 庫存管理 Hook
 * 封裝庫存相關的業務邏輯
 */

import { useEffect, useCallback } from 'react';
import { useInventoryStore } from '@/stores/useInventoryStore';
import { useUIStore } from '@/stores/useUIStore';
import { fetchInventory, refreshInventory } from '@/services/api';

export function useInventory() {
  const {
    mainItems,
    sideCategories,
    inventory,
    currentVenue,
    venueCache,
    isLoading,
    error,
    setMainItems,
    setSideCategories,
    setInventory,
    setCurrentVenue,
    cacheVenueData,
    getCachedVenue,
    clearVenueCache,
    setLoading,
    setError,
    isItemOutOfStock,
    getStockInfo,
  } = useInventoryStore();

  const { showNotification } = useUIStore();

  /**
   * 載入庫存資料
   */
  const loadInventory = useCallback(
    async (venue?: string) => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchInventory(venue);

        if (data.mainItems && data.mainItems.length > 0) {
          setMainItems(data.mainItems);
        }

        if (data.categories && Object.keys(data.categories).length > 0) {
          setSideCategories(data.categories);
        }

        setInventory(data.inventory);

        // 如果指定了場地，快取數據
        if (venue) {
          cacheVenueData(venue, {
            inventory: data.inventory,
            categories: data.categories || {},
            mainItems: data.mainItems || [],
            timestamp: Date.now(),
          });
        }

        console.log('✅ 庫存載入成功');
      } catch (err) {
        const message = err instanceof Error ? err.message : '載入庫存失敗';
        setError(message);
        showNotification('error', message);
        console.error('❌ 庫存載入失敗:', err);
      } finally {
        setLoading(false);
      }
    },
    [
      setLoading,
      setError,
      setMainItems,
      setSideCategories,
      setInventory,
      cacheVenueData,
      showNotification,
    ]
  );

  /**
   * 切換場地
   */
  const switchVenue = useCallback(
    async (venue: string) => {
      // 檢查快取
      const cached = getCachedVenue(venue);

      if (cached) {
        console.log('⚡ 使用快取資料（秒速載入）');

        // 立即使用快取數據更新 UI
        setInventory(cached.inventory);
        setSideCategories(cached.categories);
        setMainItems(cached.mainItems);
        setCurrentVenue(venue);

        showNotification('success', '⚡ 場地已切換');

        // 背景靜默刷新
        setTimeout(async () => {
          try {
            console.log(`🔄 背景刷新場地庫存：${venue}`);
            const data = await refreshInventory(venue);

            // 只在用戶還在同一個場地時才更新
            if (useInventoryStore.getState().currentVenue === venue) {
              setInventory(data.inventory);
              cacheVenueData(venue, {
                inventory: data.inventory,
                categories: data.categories || {},
                mainItems: data.mainItems || [],
                timestamp: Date.now(),
              });
              console.log('✅ 背景刷新完成');
            }
          } catch (err) {
            console.warn('⚠️ 背景刷新失敗:', err);
          }
        }, 100);
      } else {
        // 沒有快取，顯示載入提示
        setCurrentVenue(venue);
        await loadInventory(venue);
        showNotification('success', '✅ 場地資料已更新');
      }
    },
    [
      getCachedVenue,
      setInventory,
      setSideCategories,
      setMainItems,
      setCurrentVenue,
      cacheVenueData,
      showNotification,
      loadInventory,
    ]
  );

  /**
   * 🚀 預載入所有場地資料（讓切換秒開）
   */
  const preloadAllVenues = useCallback(
    async (venues: Array<{ code: string; name: string; status: string }>) => {
      console.log('🚀 開始預載入所有場地資料...');
      const activeVenues = venues.filter((v) => v.status !== '暫停');

      // 並行載入所有場地的資料
      const preloadPromises = activeVenues.map(async (venue) => {
        try {
          const data = await fetchInventory(venue.code);

          if (data.ok) {
            // 儲存到快取
            cacheVenueData(venue.code, {
              inventory: data.inventory,
              categories: data.categories || {},
              mainItems: data.mainItems || [],
              timestamp: Date.now(),
            });
            console.log(`✅ 預載入完成：${venue.name}`);
          }
        } catch (err) {
          console.warn(`⚠️ 預載入失敗：${venue.name}`, err);
        }
      });

      await Promise.allSettled(preloadPromises);
      console.log('🎉 所有場地預載入完成！');
    },
    [cacheVenueData]
  );

  /**
   * 手動刷新庫存
   */
  const refresh = useCallback(async () => {
    if (!currentVenue) {
      showNotification('warning', '⚠️ 請先選擇取餐場地');
      return;
    }

    // 清除快取
    clearVenueCache(currentVenue);

    try {
      showNotification('info', '🔄 刷新庫存中...');
      const data = await refreshInventory(currentVenue);

      setInventory(data.inventory);

      if (data.mainItems && data.mainItems.length > 0) {
        setMainItems(data.mainItems);
      }

      if (data.categories && Object.keys(data.categories).length > 0) {
        setSideCategories(data.categories);
      }

      // 重新快取
      cacheVenueData(currentVenue, {
        inventory: data.inventory,
        categories: data.categories || {},
        mainItems: data.mainItems || [],
        timestamp: Date.now(),
      });

      showNotification('success', '✅ 庫存已更新');
    } catch (err) {
      const message = err instanceof Error ? err.message : '刷新失敗';
      showNotification('error', `❌ ${message}`);
    }
  }, [
    currentVenue,
    clearVenueCache,
    setInventory,
    setMainItems,
    setSideCategories,
    cacheVenueData,
    showNotification,
  ]);

  return {
    mainItems,
    sideCategories,
    inventory,
    currentVenue,
    isLoading,
    error,
    loadInventory,
    switchVenue,
    refresh,
    preloadAllVenues,
    isItemOutOfStock,
    getStockInfo,
  };
}

