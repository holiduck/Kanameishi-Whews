<template>
    <el-dialog
        v-model="visible"
        class="data-source-manager"
        title="数据源管理"
        width="min(900px, 94vw)"
        top="6vh"
        :show-close="false"
        append-to-body
    >
        <el-alert
            v-if="!hasWhewsToken"
            class="api-key-warning"
            type="warning"
            :closable="false"
            show-icon
        >
            <template #title>
                <span>尚未配置 WHEWS Token，部分功能受限。</span>
                <el-button type="primary" link @click="emit('manage-api-key')">前往管理 Token</el-button>
            </template>
        </el-alert>
        <el-alert
            v-else-if="statusStore.whewsAuthStatus == 0"
            class="api-key-warning"
            type="error"
            :closable="false"
            show-icon
        >
            <template #title>
                <span>WHEWS 认证失败，部分功能受限。请检查 Token 是否正确。</span>
                <el-button type="primary" link @click="emit('manage-api-key')">前往管理 Token</el-button>
            </template>
        </el-alert>
        <el-tabs v-model="activeCategory" stretch>
            <el-tab-pane
                v-for="category in dataSourceCategories"
                :key="category.key"
                :label="category.label"
                :name="category.key"
            >
                <div class="source-table-wrap">
                    <table class="source-table">
                        <thead>
                            <tr>
                                <th class="source-name">数据源</th>
                                <th>全部</th>
                                <th
                                    v-for="provider in providersFor(category.key)"
                                    :key="provider"
                                >
                                    {{ dataSourceProviders[provider] }}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="source in sourcesFor(category.key)" :key="source">
                                <td class="source-name">{{ dataSourceCatalog[source].label }}</td>
                                <td>
                                    <el-checkbox
                                        :model-value="settingsStore.isDataSourceFullyEnabled(source)"
                                        :indeterminate="settingsStore.isDataSourcePartiallyEnabled(source)"
                                        :aria-label="`${dataSourceCatalog[source].label}全部API`"
                                        @change="toggleSource(source, $event)"
                                    />
                                </td>
                                <td
                                    v-for="provider in providersFor(category.key)"
                                    :key="provider"
                                >
                                    <div
                                        v-if="provider == 'whews' || dataSourceCatalog[source].apis.includes(provider)"
                                        class="api-control"
                                    >
                                        <el-checkbox
                                            :model-value="settingsStore.mainSettings.dataSources[source]?.[provider]"
                                            :aria-label="`${dataSourceCatalog[source].label} ${dataSourceProviders[provider]}`"
                                            @change="toggleApi(source, provider, $event)"
                                        />
                                        <el-select
                                            v-if="source == 'ceaEew' && provider == 'whews'"
                                            v-model="settingsStore.mainSettings.provinceCeaEew"
                                            class="cea-whews-level"
                                            size="small"
                                            :disabled="!settingsStore.mainSettings.dataSources.ceaEew?.whews"
                                            aria-label="中国地震局 WHEWS 级别"
                                            @change="markChanged"
                                        >
                                            <el-option label="国家级" :value="false" />
                                            <el-option label="省级" :value="true" />
                                        </el-select>
                                    </div>
                                    <span v-else class="unsupported-blank" aria-hidden="true" />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </el-tab-pane>
        </el-tabs>
        <template #footer>
            <div class="dialog-footer">
                <span v-if="dirty" class="reload-hint">更改需重载后生效</span>
                <div class="footer-actions">
                    <el-button
                        v-if="dirty"
                        type="warning"
                        @click="reloadNow"
                    >重载以应用变更</el-button>
                    <el-button type="primary" @click="visible = false">
                        {{ dirty ? '稍后重载' : '完成' }}
                    </el-button>
                </div>
            </div>
        </template>
    </el-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useSettingsStore } from '@/stores/settings';
import { useAccessStore } from '@/stores/access';
import { useStatusStore } from '@/stores/status';
import {
    dataSourceCatalog,
    dataSourceCategories,
    dataSourceProviders,
} from '@/utils/DataSources';

const visible = defineModel({ type: Boolean, default: false })
const emit = defineEmits(['change', 'manage-api-key'])
const settingsStore = useSettingsStore()
const accessStore = useAccessStore()
const statusStore = useStatusStore()
const activeCategory = ref(dataSourceCategories[0].key)
const dirty = ref(false)
const hasWhewsToken = computed(() => Boolean(
    settingsStore.mainSettings.apiKeys.whewsToken?.trim()
))

watch(visible, (open) => {
    if (open) dirty.value = false
})

const markChanged = () => {
    dirty.value = true
    emit('change')
}

const reloadNow = () => {
    window.location.reload()
}

const visibleSources = computed(() => Object.keys(dataSourceCatalog).filter(source => {
    const requiredCapability = dataSourceCatalog[source].requiredCapability
    return !requiredCapability || accessStore.canUse(requiredCapability)
}))

const sourcesFor = category => visibleSources.value
    .filter(source => dataSourceCatalog[source].category == category)
    .sort((sourceA, sourceB) => dataSourceCatalog[sourceA].displayOrder - dataSourceCatalog[sourceB].displayOrder)
const providersFor = category => [...new Set(
    sourcesFor(category).flatMap(source => dataSourceCatalog[source].apis)
)]

const canEnable = async (source) => {
    if(!settingsStore.isDataSourceAvailable(source)) return false
    return true
}

const toggleSource = async (source, enabled) => {
    const previousApis = { ...settingsStore.mainSettings.dataSources[source] }
    settingsStore.setDataSourceEnabled(source, enabled)
    if(enabled && !await canEnable(source)) {
        Object.assign(settingsStore.mainSettings.dataSources[source], previousApis)
        return
    }
    markChanged()
}

const toggleApi = async (source, api, enabled) => {
    if (!settingsStore.mainSettings.dataSources[source]) {
        settingsStore.mainSettings.dataSources[source] = {}
    }
    // WHEWS 全源可勾选：确保字段存在
    if (api == 'whews' && !Object.hasOwn(settingsStore.mainSettings.dataSources[source], 'whews')) {
        settingsStore.mainSettings.dataSources[source].whews = false
    }
    const previousValue = settingsStore.mainSettings.dataSources[source][api]
    settingsStore.mainSettings.dataSources[source][api] = enabled
    if(enabled && !await canEnable(source)) {
        settingsStore.mainSettings.dataSources[source][api] = previousValue
        return
    }
    markChanged()
}
</script>

<style lang="scss">
.data-source-manager {
    max-height: 88vh;
    display: flex;
    flex-direction: column;

    .el-dialog__body {
        min-height: 0;
        padding-top: 4px;
        overflow: hidden;
    }

    .api-key-warning {
        margin-bottom: 8px;

        .el-alert__title {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 4px;
        }

        .el-button {
            height: auto;
            padding: 0;
        }
    }

    .el-tabs,
    .el-tabs__content,
    .el-tab-pane {
        min-height: 0;
    }

    .source-table-wrap {
        max-height: calc(88vh - 180px);
        overflow: auto;
        border: 1px solid var(--el-border-color);
        border-radius: 6px;
    }

    .dialog-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        width: 100%;
        flex-wrap: wrap;
    }

    .reload-hint {
        color: var(--el-color-warning);
        font-size: 13px;
    }

    .footer-actions {
        display: flex;
        gap: 8px;
        margin-left: auto;
    }

    .source-table {
        width: 100%;
        min-width: 640px;
        border-collapse: collapse;
        table-layout: fixed;

        th,
        td {
            height: 44px;
            padding: 6px 10px;
            border-right: 1px solid var(--el-border-color-lighter);
            border-bottom: 1px solid var(--el-border-color-lighter);
            text-align: center;
            vertical-align: middle;
        }

        th {
            position: sticky;
            top: 0;
            z-index: 1;
            background: var(--el-bg-color);
            font-weight: 600;
        }

        th:last-child,
        td:last-child {
            border-right: 0;
        }

        tbody tr:last-child td {
            border-bottom: 0;
        }

        .source-name {
            width: 250px;
            text-align: left;
        }

        .api-control {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }

        .cea-whews-level {
            width: 82px;
        }

        .el-checkbox {
            margin: 0;
            height: 24px;
        }

        .unsupported-blank {
            display: inline-block;
            width: 16px;
            height: 16px;
        }

        .unsupported {
            color: var(--el-text-color-placeholder);
        }
    }
}

@media (max-width: 600px) {
    .data-source-manager {
        margin-top: 3vh;
        max-height: 94vh;

        .el-dialog__header,
        .el-dialog__body,
        .el-dialog__footer {
            padding-left: 12px;
            padding-right: 12px;
        }

        .source-table-wrap {
            max-height: calc(94vh - 170px);
        }
    }
}
</style>
