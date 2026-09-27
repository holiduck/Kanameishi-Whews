<template>
    <div>

    </div>
</template>

<script setup>
import { reactive, computed, onMounted, onBeforeUnmount, watch, inject } from 'vue';
import { isNetworkPeriodActive } from '@/features/eew/EewNetworkRelations';
import { useStatusStore } from '@/stores/status';
import { useSettingsStore } from '@/stores/settings';
import { iconUrls, seisNetUrls, whewsUrl } from '@/utils/Urls';
import { playSound, sendMyNotification, focusWindow, getShindoFromInstShindo, getShindoFromLevel, calcTimeDiff } from '@/utils/Utils';
import 'leaflet/dist/leaflet.css';
import { simpleIcon, SnetStation } from '@/classes/StationClasses';
import { SnetStationCanvasLayer } from '@/classes/StationCanvasLayer';
import { NiedGridCanvasLayer } from '@/classes/GridCanvasLayer';
import WebSocketObj from '@/classes/WebSocket';

const statusStore = useStatusStore()
const settingsStore = useSettingsStore()
const useStationCanvasRenderer = computed(() => !settingsStore.advancedSettings.fallbackSvgStationRender)

const snetUpdateTime = inject('snetUpdateTime')
const snetLinkOk = inject('snetLinkOk')
const snetMaxShindo = inject('snetMaxShindo')
const snetPeriodMaxShindo = inject('snetPeriodMaxShindo')
const snetPeriodBarClass = inject('snetPeriodBarClass')
const handleTempEqlists = inject('handleTempEqlists')

const stationList = reactive([])
const stations = reactive([])
let stationCanvasLayer = null
let map
let stopped = false
let pendingRender = false
let periodMaxLevel = -1
let snetSocket = null
let lastFrame = null
let wsConnected = false

const syncLinkOk = () => {
    snetLinkOk.value = wsConnected && !!lastFrame
}

const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && pendingRender) {
        pendingRender = false
        renderAll()
    }
}

const currentMaxShindo = computed(() => {
    const currentMaxLevel = Math.max(...stations.map(s => s.level), -1)
    if(currentMaxLevel == -1) return -1
    else if(currentMaxLevel <= 7) return 0
    else if(currentMaxLevel <= 9) return 1
    else if(currentMaxLevel <= 11) return 2
    else if(currentMaxLevel <= 13) return 3
    else if(currentMaxLevel <= 15) return 4
    else if(currentMaxLevel <= 17) return 5
    else if(currentMaxLevel <= 19) return 6
    else return 7
})

const renderAll = () => {
    if(useStationCanvasRenderer.value) {
        stationCanvasLayer?.redraw()
        return
    }
    stations.forEach(station => station.render())
}

const initStationCanvasLayer = () => {
    if(!useStationCanvasRenderer.value) return
    if(!map || stationCanvasLayer || stations.length === 0) return
    stationCanvasLayer = new SnetStationCanvasLayer(stations).addTo(map)
}

const rebuildStations = (list) => {
    if(!map || !list?.length) return
    stations.forEach(station => station.terminate())
    stations.length = 0
    map.eachLayer(layer => {
        if(layer.options.pane?.includes('snetStationPane')) map.removeLayer(layer)
    })
    if(stationCanvasLayer) {
        map.removeLayer(stationCanvasLayer)
        stationCanvasLayer = null
    }
    list.forEach((item, index) => {
        stations.push(reactive(new SnetStation(
            map,
            index,
            [item.latitude, item.longitude],
            -3.1,
            useStationCanvasRenderer.value
        )))
    })
    initStationCanvasLayer()
    if(lastFrame?.shindo?.length === stations.length) {
        applyShindo(lastFrame.timestamp, lastFrame.shindo)
    } else {
        lastFrame = null
        syncLinkOk()
        renderAll()
    }
}

const applyShindo = (timestamp, shindo) => {
    if(!Array.isArray(shindo) || shindo.length !== stations.length) return
    const render = document.visibilityState === 'visible'
    if(!render) pendingRender = true
    let maxInst = -3.1
    stations.forEach((station, index) => {
        const intensity = Number(shindo[index])
        station.update(intensity, render)
        if(Number.isFinite(intensity) && intensity > maxInst) maxInst = intensity
    })
    if(render && useStationCanvasRenderer.value) renderAll()
    snetMaxShindo.value = getShindoFromInstShindo(maxInst)
    if(timestamp) snetUpdateTime.value = timestamp

    let maxLevel = -1
    stations.forEach(station => {
        if(station.level > maxLevel) maxLevel = station.level
        if(station.isActive && station.level > periodMaxLevel) periodMaxLevel = station.level
    })
    snetPeriodMaxShindo.value = getShindoFromLevel(periodMaxLevel)
    snetPeriodBarClass.value = maxLevel >= 0
        ? NiedGridCanvasLayer.getGridColorByLevel(maxLevel)
        : 'gray'
    statusStore.isActive.snetNet = stations.some(s => s.isActive)
}

onMounted(() => {
    const token = settingsStore.mainSettings.apiKeys.whewsToken?.trim()
    if(!token) {
        ElMessage({
            message: '未填写 WHEWS Token，S-Net 不可用',
            type: 'error'
        })
        settingsStore.mainSettings.displaySeisNet.snetNet = false
        return
    }
    const urls = [...seisNetUrls.snet].map(u => whewsUrl(u, token))
    const preferDomestic = settingsStore.advancedSettings.defaultWhewsPreferForeign === false
    if(preferDomestic && urls.length > 1) {
        urls.unshift(...urls.splice(1, 1))
    }
    snetSocket = new WebSocketObj(urls)
    snetSocket.setStateHandler(rs => {
        wsConnected = rs === 1
        syncLinkOk()
    })
    snetSocket.setMessageHandler(e => {
        if(stopped) return
        let data
        try {
            data = JSON.parse(e.data)
        } catch (_) {
            return
        }
        if(data?.type == 'heartbeat' || data?.type == 'pong') return
        if(data?.type == 'snet_stations_update' || data?.type == 'initial_stations') {
            const list = data.stations
            if(list && JSON.stringify(list) != JSON.stringify(stationList)) {
                stationList.length = 0
                stationList.push(...list)
            }
            return
        }
        if(data?.source == 'snet' || data?.Data?.shindo) {
            const Data = data.Data
            if(!Data?.shindo) return
            const timeDiff = calcTimeDiff(Data.timestamp, 9, snetUpdateTime.value, 9)
            if(timeDiff < 0) return
            lastFrame = { timestamp: Data.timestamp, shindo: Data.shindo }
            applyShindo(Data.timestamp, Data.shindo)
            syncLinkOk()
        }
    })
    document.addEventListener('visibilitychange', handleVisibilityChange)
})

let unwatchStationList, unwatchRender
watch(() => statusStore.map, newVal => {
    if(newVal !== null){
        map = newVal
        map.on('zoomend', renderAll)
        unwatchStationList = watch(stationList, newVal => {
            if(newVal.length > 0) rebuildStations(newVal)
        }, { immediate: true, deep: true })
        unwatchRender = watch(
            () => `${settingsStore.mainSettings.displaySeisNet.style}
            |${settingsStore.mainSettings.displaySeisNet.displaySnetShindo}
            |${settingsStore.mainSettings.displaySeisNet.hideNoData}
            |${simpleIcon.value}
            |${settingsStore.mainSettings.displaySeisNet.displayShindo0}`,
            renderAll
        )
    }
}, { immediate: true })

watch(() => isNetworkPeriodActive('snetNet', statusStore.isActive), newVal => {
    if(newVal){
        if(periodMaxLevel == -1){
            periodMaxLevel = 0
            snetPeriodMaxShindo.value = getShindoFromLevel(periodMaxLevel)
        }
    }
    else{
        periodMaxLevel = -1
        snetPeriodMaxShindo.value = getShindoFromLevel(periodMaxLevel)
    }
}, { immediate: true })

let shake1Notified = false, shake2Notified = false
let focused = false
watch(currentMaxShindo, (newVal, oldVal) => {
    if(newVal > oldVal){
        if(settingsStore.mainSettings.onShake.sound) playSound(`shindo${newVal}`)
        if(settingsStore.mainSettings.onShake.notification){
            if(newVal >= 1 && newVal <= 3 && !shake1Notified){
                sendMyNotification('檢測到震動', '請注意搖晃。', iconUrls.caution)
                shake1Notified = true
            }
            else if(newVal >= 4 && !shake2Notified){
                sendMyNotification('檢測到強震動', '請警戒強烈搖晃。', iconUrls.warn)
                shake1Notified = true
                shake2Notified = true
            }
        }
        if(settingsStore.mainSettings.onShake.focus && newVal >= 1 && !focused){
            focusWindow()
            focused = true
        }
        handleTempEqlists(0)
    }
    else{
        shake1Notified = false
        shake2Notified = false
        focused = false
    }
})

onBeforeUnmount(() => {
    stopped = true
    snetSocket?.close()
    wsConnected = false
    lastFrame = null
    syncLinkOk()
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    if(unwatchStationList) unwatchStationList()
    if(unwatchRender) unwatchRender()
    stations.forEach(station => station.terminate())
    stations.length = 0
    statusStore.isActive.snetNet = false
    if(map) {
        map.off('zoomend', renderAll)
        if(stationCanvasLayer && map.hasLayer(stationCanvasLayer)) map.removeLayer(stationCanvasLayer)
        map.eachLayer(layer => {
            if(layer.options.pane?.includes('snetStationPane')) map.removeLayer(layer)
        })
    }
    stationCanvasLayer = null
})
</script>

<style lang="scss" scoped>
</style>
