<template>
  <div class="outer1">
    <div class="container">
      <div class="bar" @click="smoothScrollToTop">
        <div class="title">地震/海啸信息</div>
        <div class="switch">
          <el-select
            style="width: 90px;"
            v-model="settingsStore.mainSettings.historyMagThres"
            size="small"
            @click.stop
          >
            <el-option label="所有震级" :value="0" />
            <el-option label="2.0级以上" :value="2.0" />
            <el-option label="2.5级以上" :value="2.5" />
            <el-option label="3.0级以上" :value="3.0" />
            <el-option label="3.5级以上" :value="3.5" />
            <el-option label="4.0级以上" :value="4.0" />
            <el-option label="4.5级以上" :value="4.5" />
            <el-option label="5.0级以上" :value="5.0" />
            <el-option label="5.5级以上" :value="5.5" />
            <el-option label="6.0级以上" :value="6.0" />
            <el-option label="6.5级以上" :value="6.5" />
            <el-option label="7.0级以上" :value="7.0" />
            <el-option label="7.5级以上" :value="7.5" />
            <el-option label="8.0级以上" :value="8.0" />
          </el-select>
          <el-select
            style="width: 90px;"
            v-model="settingsStore.mainSettings.historySources"
            size="small"
            multiple
            placeholder=""
            @click.stop
          >
            <template #tag>
              <span class="el-select__placeholder custom-tag">
                {{ settingsStore.mainSettings.historySources.length }}个数据源
              </span>
            </template>
            <el-option label="CENC" value="CENC" />
            <el-option label="CWA" value="CWA" />
            <el-option label="JMA" value="JMA" />
            <el-option label="KMA" value="KMA" />
            <el-option label="USGS" value="USGS" />
            <el-option label="EMSC" value="EMSC" />
            <el-option label="HKO" value="HKO" />
            <el-option label="BMKG" value="BMKG" />
            <el-option label="GFZ" value="GFZ" />
            <el-option label="GeoNet" value="GeoNet" />
            <el-option label="TMD" value="TMD" />
            <el-option label="USP" value="USP" />
            <el-option label="INGV" value="INGV" />
            <el-option label="BCSF" value="BCSF" />
            <el-option label="NRCAN" value="NRCAN" />
            <el-option label="MMD" value="MMD" />
            <el-option label="PHIVOLCS" value="PHIVOLCS" />
            <el-option label="GA" value="GA" />
            <el-option label="CENAIS" value="CENAIS" />
            <el-option label="GSRAS" value="GSRAS" />
            <el-option label="BGS" value="BGS" />
            <el-option label="IPMA" value="IPMA" />
            <el-option label="SSN" value="SSN" />
            <el-option label="AFAD" value="AFAD" />
            <el-option label="SED" value="SED" />
            <el-option label="NOA" value="NOA" />
            <el-option label="SCSN" value="SCSN" />
            <el-option label="IAG" value="IAG" />
            <el-option label="IGP" value="IGP" />
            <el-option label="NEPAL" value="NEPAL" />
            <el-option label="BJ" value="BJ" />
            <el-option label="YN" value="YN" />
            <el-option label="NX" value="NX" />
            <el-option label="CENC_INT" value="CENC_INT" />
          </el-select>
        </div>
      </div>
      <div class="content" ref="content">
        <div class="wrap">
          <NmefcTsunami v-if="settingsStore.isDataSourceEnabled('nmefcTsunami')" v-show="statusStore.isActive.nmefcTsunami" />
          <JmaTsunami v-if="settingsStore.isDataSourceEnabled('jmaTsunami')" v-show="statusStore.isActive.jmaTsunami" />
          <EqlistHistoryComponent />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import NmefcTsunami from './components/NmefcTsunami.vue';
import JmaTsunami from './components/JmaTsunami.vue';
import { useSettingsStore } from '@/stores/settings';
import { useStatusStore } from '@/stores/status';
import EqlistHistoryComponent from './components/EqlistHistory.vue';
import { ref, watch, inject } from 'vue';

const settingsStore = useSettingsStore()
const statusStore = useStatusStore()

const content = ref(null)
const menuId = inject('menuId')
const scrollToTop = () => content.value.scrollTop = 0
const smoothScrollToTop = () => {
  content.value.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}
watch(() => menuId.value == 'eqlists', scrollToTop)

</script>

<style lang="scss" scoped>
.outer1 {
  width: 100%;
  height: 100%;
  .container {
    width: 100%;
    height: 100%;
    padding: 5px;
    padding-right: 0;
    display: flex;
    flex-direction: column;
    gap: 5px;
    user-select: none;
    .bar {
      width: 100%;
      height: 28px;
      display: flex;
      align-items: center;
      .title {
        font-size: 24px;
        font-weight: 700;
      }
      .switch {
        width: 200px;
        margin-left: 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        :deep(.custom-tag) {
          display: flex;
          justify-content: center;
          align-items: center;
        }
        :deep(.el-select__input) {
          cursor: pointer;
        }
      }
    }
    .content {
      width: 100%;
      height: 100%;
      overflow: auto;
      .wrap {
        padding-right: calc(100% - 390px);
      }
    }
  }
}
</style>
