import { defineStore } from 'pinia';
import Http from '@/classes/Http';
import WebSocketObj from '@/classes/WebSocket';
import { eqUrls, whewsUrl, whewsForeign, tsunamiUrls } from '@/utils/Urls';
import { setClassName, calcCsisLevel, stampToTime, getShindoFromInstShindo, getShindoRank, calcTimeDiff, formatShindo, timeToStamp, systemTimeZone, convertCompactTimeString } from '@/utils/Utils';
import { jmaSeisIntLoc } from '@/utils/JmaSeisIntLoc';
import { useSettingsStore } from './settings';
import { useTimeStore } from './time';
import { isTauri } from '@tauri-apps/api/core';
import { getFEName } from '@/utils/FERegions';
import isEqual from 'lodash/isEqual';
import dayjs from "dayjs";
import {
    eewSources,
    eqlistSources,
    tsunamiSources,
    wolfxSocketSources,
    whewsSocketSources,
    p2pquakeSocketSources,
} from '@/utils/DataSources';
// import utc from "dayjs/plugin/utc";
// import timezone from "dayjs/plugin/timezone";
// dayjs.extend(utc);
// dayjs.extend(timezone);

export const defaultEqMessage = {
    source: '',
    type: 0,
    id: '',
    isEew: false,
    timeZone: 8,
    intTitle: '',
    reportNum: 0,
    reportNumText: '',
    reportTime: '',
    isAssumption: false,
    isWarn: false,
    isFinal: false,
    isCanceled: false,
    title: '',
    titleText: '',
    hypocenter: '',
    hypocenterText: '',
    lat: 0,
    lng: 0,
    depth: 0,
    depthText: '',
    originTime: '',
    originTimeText: '',
    magnitude: 0,
    magnitudeText: '',
    useShindo: false,
    maxIntensity: '',
    maxIntensityText: '',
    warnArea: '[]',
    className: ''
}
export const defaultTsunamiMessage = {
    source: '',
    id: '',
    timeZone: 8,
    reportTime: '',
    title: '',
    titleText: '',
    status: 0,
    warnArea: '[]',
    className: ''
}

export { eewSources, eqlistSources, tsunamiSources }
export const seisNetSources = ['palertNet', 'tremNet', 'niedNet', 'snetNet', 'kmaNet']

const wolfx2Source = {
    'jma_eew': 'jmaEew',
    'cwa_eew': 'cwaEew',
    'cenc_eew': 'ceaEew',
    'sc_eew': 'scEew',
    'fj_eew': 'fjEew',
    'jma_eqlist': 'jmaEqlist',
    'cenc_eqlist': 'cencEqlist',
}
/** WHEWS /ws/all · /ws/cea_all frame `source` → app source key */
const whews2Source = {
    'jma_eew': 'jmaEew',
    'cwa_eew': 'cwaEew',
    'cea': 'ceaEew',
    'cea-pr': 'ceaEew', // may remap to scEew / fjEew in handleWhewsFrame
    'sa_eew': 'saEew',
    'early_est': 'earlyEstEew',
    'kma_eew': 'kmaEew',
    'jma': 'jmaEqlist',
    'cwa': 'cwaEqlist',
    'cenc': 'cencEqlist',
    'cenc_int': 'cencIntEqlist',
    'kma': 'kmaEqlist',
    'usgs': 'usgsEqlist',
    'emsc': 'emscEqlist',
    'hko': 'hkoEqlist',
    'bmkg': 'bmkgEqlist',
    'gfz': 'gfzEqlist',
    'geonet': 'geonetEqlist',
    'tmd': 'tmdEqlist',
    'usp': 'uspEqlist',
    'ingv': 'ingvEqlist',
    'bcsf': 'bcsfEqlist',
    'nrcan': 'nrcanEqlist',
    'mmd': 'mmdEqlist',
    'phivolcs': 'phivolcsEqlist',
    'ga': 'gaEqlist',
    'cenais': 'cenaisEqlist',
    'gsras': 'gsrasEqlist',
    'bgs': 'bgsEqlist',
    'ipma': 'ipmaEqlist',
    'ssn': 'ssnEqlist',
    'afad': 'afadEqlist',
    'sed': 'sedEqlist',
    'noa': 'noaEqlist',
    'scsn': 'scsnEqlist',
    'iag': 'iagEqlist',
    'igp': 'igpEqlist',
    'nepal': 'nepalEqlist',
    'beijing': 'beijingEqlist',
    'yunnan': 'yunnanEqlist',
    'ningxia': 'ningxiaEqlist',
    'jma_tsunami': 'jmaTsunami',
    'tsunami': 'nmefcTsunami',
    'cwa_tsunami': 'cwaTsunami',
    'ntwc': 'ntwcTsunami',
    'ptwc': 'ptwcTsunami',
    'incois': 'incoisTsunami',
    'cat_tsunami': 'catTsunami',
}

const whewsEqlistMeta = {
    jmaEqlist: { label: '気象庁', sourceTag: 'JMA' },
    usgsEqlist: { label: 'USGS', sourceTag: 'USGS' },
    kmaEqlist: { label: '기상청', sourceTag: 'KMA' },
    emscEqlist: { label: 'EMSC', sourceTag: 'EMSC' },
    hkoEqlist: { label: '香港天文台', sourceTag: 'HKO' },
    bmkgEqlist: { label: 'BMKG', sourceTag: 'BMKG' },
    gfzEqlist: { label: 'GFZ', sourceTag: 'GFZ' },
    geonetEqlist: { label: 'GeoNet', sourceTag: 'GeoNet' },
    tmdEqlist: { label: 'TMD', sourceTag: 'TMD' },
    uspEqlist: { label: 'USP', sourceTag: 'USP' },
    ingvEqlist: { label: 'INGV', sourceTag: 'INGV' },
    bcsfEqlist: { label: 'BCSF', sourceTag: 'BCSF' },
    nrcanEqlist: { label: 'NRCan', sourceTag: 'NRCAN' },
    mmdEqlist: { label: 'MMD', sourceTag: 'MMD' },
    phivolcsEqlist: { label: 'PHIVOLCS', sourceTag: 'PHIVOLCS' },
    gaEqlist: { label: 'GA', sourceTag: 'GA' },
    cenaisEqlist: { label: 'CENAIS', sourceTag: 'CENAIS' },
    gsrasEqlist: { label: 'GSRAS', sourceTag: 'GSRAS' },
    bgsEqlist: { label: 'BGS', sourceTag: 'BGS' },
    ipmaEqlist: { label: 'IPMA', sourceTag: 'IPMA' },
    ssnEqlist: { label: 'SSN', sourceTag: 'SSN' },
    afadEqlist: { label: 'AFAD', sourceTag: 'AFAD' },
    sedEqlist: { label: 'SED', sourceTag: 'SED' },
    noaEqlist: { label: 'NOA', sourceTag: 'NOA' },
    scsnEqlist: { label: 'SCSN', sourceTag: 'SCSN' },
    iagEqlist: { label: 'IAG', sourceTag: 'IAG' },
    igpEqlist: { label: 'IGP', sourceTag: 'IGP' },
    nepalEqlist: { label: 'NEPAL', sourceTag: 'NEPAL' },
    beijingEqlist: { label: '北京地震局', sourceTag: 'BJ' },
    yunnanEqlist: { label: '云南地震局', sourceTag: 'YN' },
    ningxiaEqlist: { label: '宁夏地震局', sourceTag: 'NX' },
    cencIntEqlist: { label: 'CENC烈度速报', sourceTag: 'CENC_INT' },
}

const whewsProvinceEew = (province) => {
    const p = String(province || '')
    if (p.includes('四川') || p === 'SC' || p.includes('Sichuan')) return 'scEew'
    if (p.includes('福建') || p === 'FJ' || p.includes('Fujian')) return 'fjEew'
    return null
}

const fmtMag = (v) => (v == null || Number.isNaN(Number(v)) ? '不明' : Number(v).toFixed(1))
const fmtDepthKm = (v, unknown = '不明') => {
    if (v == null || Number.isNaN(Number(v))) return unknown
    return `${Math.max(0, Number(v))}km`
}

const adaptWhewsInfo = (data, { preferFeName = false } = {}) => {
    const magnitude = Number(data?.magnitude)
    let depth = Number(data?.depth)
    if (!Number.isFinite(depth)) depth = null
    else if (depth < 0) depth = 0
    const lat = Number(data?.latitude)
    const lng = Number(data?.longitude)
    const fe = Number.isFinite(lat) && Number.isFinite(lng) ? (getFEName(lat, lng) || '') : ''
    const placeRaw = (data?.placeName && String(data.placeName).trim()) || ''
    const hypocenter = preferFeName
        ? (fe || placeRaw || '未知区域')
        : (placeRaw || fe || '未知区域')
    const info = String(data?.infoTypeName || '')
    const infoLower = info.toLowerCase()
    let kind = '地震测定'
    if (info.includes('正式') || infoLower.includes('review')) kind = '正式测定'
    else if (info.includes('自动') || infoLower === 'automatic') kind = '自动测定'
    const magOk = Number.isFinite(magnitude)
    const maxIntensity = magOk && magnitude >= 0
        ? calcCsisLevel(magnitude, depth ?? 10, 0)
        : '0'
    return {
        id: data?.id,
        magnitude: magOk ? magnitude : null,
        depth,
        lat: Number.isFinite(lat) ? lat : null,
        lng: Number.isFinite(lng) ? lng : null,
        hypocenter,
        kind,
        originTime: data?.shockTime || '',
        reportTime: data?.updateTime || data?.createTime || data?.shockTime || '',
        maxIntensity,
    }
}

export const sourceTypes = {
    jmaEew: {
        0: 'Wolfx',
        1: 'WHEWS',
        2: 'NIED'
    },
    cwaEew: {
        0: 'Wolfx',
        1: 'WHEWS'
    },
    ceaEew: {
        0: 'Wolfx',
        1: 'WHEWS'
    },
    iclEew: {
        1: 'WHEWS'
    },
    scEew: {
        0: 'Wolfx',
        1: 'WHEWS'
    },
    fjEew: {
        0: 'Wolfx',
        1: 'WHEWS'
    },
    kmaEew: {
        1: 'WHEWS'
    },
    saEew: {
        1: 'WHEWS'
    },
    earlyEstEew: {
        1: 'WHEWS'
    },
    gqEew: {
        0: 'S',
        1: 'A',
        2: 'B',
        3: 'C',
        4: 'D',
        5: 'E',
        6: 'F',
        10: 'WHEWS',
    },
    mockEew: {
        0: 'MOCK'
    },
    jmaEqlist: {
        0: 'P2PQ',
        1: 'WHEWS'
    },
    cwaEqlist: {
        1: 'WHEWS'
    },
    cencEqlist: {
        0: 'Wolfx',
        1: 'WHEWS'
    },
    kmaEqlist: {
        1: 'WHEWS'
    },
    usgsEqlist: {
        1: 'WHEWS'
    },
    emscEqlist: {
        1: 'WHEWS'
    },
    hkoEqlist: {
        1: 'WHEWS'
    },
    bmkgEqlist: {
        1: 'WHEWS'
    },
    gfzEqlist: {
        1: 'WHEWS'
    },
    geonetEqlist: {
        1: 'WHEWS'
    },
    beijingEqlist: {
        1: 'WHEWS'
    },
    yunnanEqlist: {
        1: 'WHEWS'
    },
    ningxiaEqlist: {
        1: 'WHEWS'
    },
    tmdEqlist: { 1: 'WHEWS' },
    uspEqlist: { 1: 'WHEWS' },
    ingvEqlist: { 1: 'WHEWS' },
    bcsfEqlist: { 1: 'WHEWS' },
    nrcanEqlist: { 1: 'WHEWS' },
    mmdEqlist: { 1: 'WHEWS' },
    phivolcsEqlist: { 1: 'WHEWS' },
    gaEqlist: { 1: 'WHEWS' },
    cenaisEqlist: { 1: 'WHEWS' },
    gsrasEqlist: { 1: 'WHEWS' },
    bgsEqlist: { 1: 'WHEWS' },
    ipmaEqlist: { 1: 'WHEWS' },
    ssnEqlist: { 1: 'WHEWS' },
    afadEqlist: { 1: 'WHEWS' },
    sedEqlist: { 1: 'WHEWS' },
    noaEqlist: { 1: 'WHEWS' },
    scsnEqlist: { 1: 'WHEWS' },
    iagEqlist: { 1: 'WHEWS' },
    igpEqlist: { 1: 'WHEWS' },
    nepalEqlist: { 1: 'WHEWS' },
    cencIntEqlist: { 1: 'WHEWS' },
    cwaTsunami: { 1: 'WHEWS' },
    ntwcTsunami: { 1: 'WHEWS' },
    ptwcTsunami: { 1: 'WHEWS' },
    incoisTsunami: { 1: 'WHEWS' },
    catTsunami: { 1: 'WHEWS' },
    history: {
        0: ''
    }
}

let usgsCache = null

const cencHistoryTolerance = 1e-9

const isSameCencHistoryEvent = (event1, event2) => {
    const stamp1 = timeToStamp(event1.originTime, event1.timeZone)
    const stamp2 = timeToStamp(event2.originTime, event2.timeZone)
    return Number.isFinite(stamp1)
        && stamp1 === stamp2
        && Math.abs(event1.lat - event2.lat) <= cencHistoryTolerance
        && Math.abs(event1.lng - event2.lng) <= cencHistoryTolerance
        && Math.abs(event1.depth - event2.depth) <= cencHistoryTolerance
        && Math.abs(event1.magnitude - event2.magnitude) <= cencHistoryTolerance
}

export const useStatusStore = defineStore('statusStore', {
    state: ()=>({
        map: null,
        isTauri: isTauri(),
        isResettingApp: false,
        showMockDialog: false,
        showStatusPanel: false,
        httpRequest: null,
        wsConnectTimer: null,
        wolfxSocket: null,
        whewsAllSocket: null,
        whewsCeaSocket: null,
        whewsAuthStatus: -1,
        p2pquakeSocket: null,
        gqSocket: null,
        webSocketStatus: {
            wolfx: { readyState: 4, urlIndex: 0 },
            whews: { readyState: 4, urlIndex: 0 },
            p2pquake: { readyState: 4, urlIndex: 0 },
            gq: { readyState: 4, urlIndex: 0 },
        },
        sourceRoutes: {},
        enabledSource: [],
        isNiedUpdating: false,
        seisNetReplayDelay: 0, // Minutes behind realtime; only retained for the current session.
        eqMessage: Object.fromEntries(
            [...eewSources, ...eqlistSources, 'mockEew'].map(source => [source, Object.assign({}, defaultEqMessage)])
        ),
        tsunamiMessage: Object.fromEntries(
            tsunamiSources.map(source => [source, Object.assign({}, defaultTsunamiMessage)])
        ),
        isActive: Object.fromEntries([
            ...[...eewSources, ...eqlistSources, 'mockEew', ...tsunamiSources].map(source => [source, false]),
            ['palertNet', false],
            ['tremNet', false],
            ['niedNet', false],
            ['snetNet', false],
            ['kmaNet', false],
            ['niedInfHypo', false],
            ['palertInfHypo', false],
        ]),
        history: Object.fromEntries(
            eqlistSources.map(source => [source, []])
        ),
        cencHistoryCache: {
            wolfx: [],
            whews: [],
        },
        intReportIds: new Set(),
        historyList: null,
    }),
    getters: {
        activeWolfxSources: state => wolfxSocketSources.filter(source => state.sourceRoutes[source]?.wolfx),
        activeWhewsSources: state => whewsSocketSources.filter(source => state.sourceRoutes[source]?.whews),
        activeP2pquakeSources: state => p2pquakeSocketSources.filter(source => state.sourceRoutes[source]?.p2pquake),
        activeEqlistSources: state => eqlistSources.filter(source => state.enabledSource.includes(source)),
    },
    actions: {
        setLocalStorageItem(key, value) {
            if(this.isResettingApp) return
            localStorage.setItem(key, value)
        },
        configureDataSources(routes) {
            this.sourceRoutes = Object.fromEntries(
                Object.entries(routes).map(([source, apis]) => [source, { ...apis }])
            )
            this.enabledSource = Object.entries(this.sourceRoutes)
                .filter(([, apis]) => Object.values(apis).some(Boolean))
                .map(([source]) => source)
        },
        isApiEnabled(source, api) {
            return Boolean(this.sourceRoutes[source]?.[api])
        },
        trackWebSocketStatus(source, socket) {
            socket.setStateHandler((readyState, urlIndex) => {
                Object.assign(this.webSocketStatus[source], { readyState, urlIndex })
            })
        },
        setEqMessage(source, data, type = 0) {
            try{
                const eqMessage = this.eqMessage[source]
                const oldType = eqMessage.type
                eqMessage.source = source
                eqMessage.type = type
                switch(source){
                    case 'jmaEew':{
                        eqMessage.isEew = true
                        eqMessage.timeZone = 9
                        eqMessage.useShindo = true
                        eqMessage.intTitle = '推定最大震度'
                        switch(type) {
                            case 0: {
                                const trainingText = data.isTraining ? '訓練·' : ''
                                eqMessage.id = data.EventID
                                eqMessage.isCanceled = data.isCancel
                                eqMessage.reportNum = data.Serial
                                eqMessage.reportTime = data.AnnouncedTime.replace(/\//g, '-')
                                eqMessage.isAssumption = data.isAssumption
                                eqMessage.isWarn = data.isWarn
                                eqMessage.isFinal = data.isFinal
                                eqMessage.title = trainingText + data.Title
                                eqMessage.lat = data.Latitude
                                eqMessage.lng = data.Longitude
                                eqMessage.depth = data.Depth
                                eqMessage.depthText = '深さ: ' + data.Depth + 'km'
                                eqMessage.originTime = data.OriginTime.replace(/\//g, '-')
                                eqMessage.originTimeText = '発震時刻: ' + data.OriginTime.replace(/\//g, '-') + ' (JST)'
                                eqMessage.magnitude = data.Magunitude
                                eqMessage.magnitudeText = 'マグニチュード: ' + data.Magunitude.toFixed(1)
                                eqMessage.maxIntensity = data.MaxIntensity
                                if(data.isCancel){
                                    eqMessage.reportNumText = 'キャンセル報'
                                    eqMessage.titleText = trainingText + '緊急地震速報（取消）'
                                    eqMessage.hypocenter = trainingText + '取り消されました'
                                    eqMessage.maxIntensityText = '推定最大震度: なし'
                                    eqMessage.warnArea = '[]'
                                }
                                else{
                                    eqMessage.reportNumText = '第' + data.Serial + '報' + (data.isFinal ? '（最終）' : '')
                                    eqMessage.titleText = trainingText + data.Title
                                    eqMessage.hypocenter = trainingText + data.Hypocenter
                                    eqMessage.maxIntensityText = '推定最大震度: ' + data.MaxIntensity
                                    eqMessage.warnArea = JSON.stringify(data.WarnArea.map(item=>{
                                        return {
                                            name: item.Chiiki,
                                            intensity: item.Shindo1,
                                            className: setClassName(item.Shindo1, true)
                                        }
                                    }))
                                }
                                eqMessage.hypocenterText = '震源地: ' + eqMessage.hypocenter
                                break
                            }
                            case 1: {
                                const trainingText = (data.isTraining || data.training) ? '訓練·' : ''
                                eqMessage.id = data.id
                                eqMessage.isCanceled = !!data.cancel
                                eqMessage.reportNum = data.updates
                                eqMessage.reportTime = data.updateTime || data.createTime || data.shockTime
                                eqMessage.isAssumption = !!(data.isPLUM || data.isIPF || data.isAssumption)
                                eqMessage.isWarn = data.infoTypeName == '警報'
                                eqMessage.isFinal = !!data.final
                                eqMessage.title = trainingText + `緊急地震速報（${data.infoTypeName || '予報'}）`
                                eqMessage.lat = data.latitude
                                eqMessage.lng = data.longitude
                                eqMessage.depth = data.depth
                                eqMessage.depthText = '深さ: ' + fmtDepthKm(data.depth)
                                eqMessage.originTime = data.shockTime
                                eqMessage.originTimeText = '発震時刻: ' + eqMessage.originTime + ' (JST)'
                                eqMessage.magnitude = data.magnitude
                                eqMessage.magnitudeText = 'マグニチュード: ' + fmtMag(eqMessage.magnitude)
                                eqMessage.maxIntensity = data.epiIntensity || '不明'
                                const lgInt = data.maxLgInt != null && data.maxLgInt !== '' ? String(data.maxLgInt) : ''
                                if(data.cancel){
                                    eqMessage.reportNumText = 'キャンセル報'
                                    eqMessage.titleText = trainingText + '緊急地震速報（取消）'
                                    eqMessage.hypocenter = trainingText + '取り消されました'
                                    eqMessage.maxIntensityText = '推定最大震度: なし'
                                    eqMessage.warnArea = '[]'
                                }
                                else{
                                    eqMessage.reportNumText = '第' + data.updates + '報' + (data.final ? '（最終）' : '')
                                    eqMessage.titleText = trainingText + `緊急地震速報（${data.infoTypeName || '予報'}）`
                                    eqMessage.hypocenter = trainingText + (data.placeName || '')
                                    eqMessage.maxIntensityText = '推定最大震度: ' + eqMessage.maxIntensity
                                        + (lgInt ? `（長周期${lgInt}）` : '')
                                    const fallInt = eqMessage.maxIntensity != '不明' ? eqMessage.maxIntensity : ''
                                    const warnAreas = Array.isArray(data.warningAreas) ? data.warningAreas : []
                                    eqMessage.warnArea = JSON.stringify(warnAreas.map(item => {
                                        const name = item.name || item.Chiiki || item.area || ''
                                        const intensity = item.intensity || item.Shindo1 || fallInt
                                        return {
                                            name,
                                            intensity,
                                            className: setClassName(intensity, true)
                                        }
                                    }).filter(item => item.name))
                                }
                                eqMessage.hypocenterText = '震源地: ' + eqMessage.hypocenter
                                break
                            }
                            case 2: {
                                const trainingText = data.is_training ? '訓練·' : ''
                                eqMessage.id = data.report_id
                                eqMessage.isCanceled = data.is_cancel
                                eqMessage.reportNum = Number(data.report_num)
                                eqMessage.reportTime = data.report_time.replace(/\//g, '-')
                                eqMessage.isAssumption = false
                                eqMessage.isWarn = data.alertflg == '警報'
                                eqMessage.isFinal = data.is_final
                                eqMessage.title = trainingText + `緊急地震速報（${data.alertflg}）`
                                eqMessage.lat = Number(data.latitude)
                                eqMessage.lng = Number(data.longitude)
                                eqMessage.depth = Number(data.depth.replace('km', ''))
                                eqMessage.depthText = '深さ: ' + data.depth
                                eqMessage.originTime = data.origin_time.replace(
                                    /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/,
                                    '$1-$2-$3 $4:$5:$6'
                                )
                                eqMessage.originTimeText = '発震時刻: ' + eqMessage.originTime + ' (JST)'
                                eqMessage.magnitude = Number(data.magunitude)
                                eqMessage.magnitudeText = 'マグニチュード: ' + eqMessage.magnitude.toFixed(1)
                                eqMessage.maxIntensity = data.calcintensity
                                if(data.is_cancel){
                                    eqMessage.reportNumText = 'キャンセル報'
                                    eqMessage.titleText = trainingText + '緊急地震速報（取消）'
                                    eqMessage.hypocenter = trainingText + '取り消されました'
                                    eqMessage.maxIntensityText = '推定最大震度: なし'
                                }
                                else{
                                    eqMessage.reportNumText = '第' + data.report_num + '報' + (data.is_final ? '（最終）' : '')
                                    eqMessage.titleText = trainingText + `緊急地震速報（${data.alertflg}）`
                                    eqMessage.hypocenter = trainingText + data.region_name
                                    eqMessage.maxIntensityText = '推定最大震度: ' + data.calcintensity
                                }
                                eqMessage.hypocenterText = '震源地: ' + eqMessage.hypocenter
                                eqMessage.warnArea = '[]'
                                break
                            }
                        }
                        break
                    }
                    case 'cwaEew':{
                        eqMessage.isEew = true
                        eqMessage.useShindo = true
                        eqMessage.intTitle = '預估最大震度'
                        switch(type) {
                            case 0:
                                eqMessage.id = data.ID
                                eqMessage.reportNum = data.ReportNum
                                eqMessage.reportNumText = '第' + data.ReportNum + '報'
                                eqMessage.reportTime = data.ReportTime
                                eqMessage.isCanceled = data.isCancel
                                eqMessage.titleText = '中央氣象署強震即時警報' + (data.isCancel?'（取消）':'')
                                eqMessage.hypocenter = data.HypoCenter
                                eqMessage.hypocenterText = '震央: ' + data.HypoCenter
                                eqMessage.lat = data.Latitude
                                eqMessage.lng = data.Longitude
                                eqMessage.depth = data.Depth
                                eqMessage.depthText = '深度: ' + data.Depth + 'km'
                                eqMessage.originTime = data.OriginTime
                                eqMessage.originTimeText = '時間: ' + data.OriginTime
                                eqMessage.magnitude = data.Magunitude
                                eqMessage.magnitudeText = '規模: ' + data.Magunitude.toFixed(1)
                                eqMessage.maxIntensity = data.MaxIntensity || '不明'
                                eqMessage.maxIntensityText = '預估最大震度: ' + eqMessage.maxIntensity
                                eqMessage.isWarn = getShindoRank(eqMessage.maxIntensity) >= 5
                                break
                            case 1:
                                if(data.id == eqMessage.id && oldType == 0) {
                                    eqMessage.type = oldType
                                    break
                                }
                                eqMessage.id = data.id
                                eqMessage.reportNum = data.updates || 1
                                eqMessage.reportNumText = '第' + eqMessage.reportNum + '報'
                                eqMessage.reportTime = data.createTime || data.updateTime || data.shockTime
                                eqMessage.isCanceled = !!data.cancel
                                eqMessage.titleText = '中央氣象署強震即時警報' + (data.cancel ? '（取消）' : '')
                                eqMessage.hypocenter = data.placeName?.replace(/ 外海 \([^)]*\)/g, "外海") || getFEName(data.latitude, data.longitude)
                                eqMessage.hypocenterText = '震央: ' + eqMessage.hypocenter
                                eqMessage.lat = data.latitude
                                eqMessage.lng = data.longitude
                                eqMessage.depth = data.depth
                                eqMessage.depthText = '深度: ' + fmtDepthKm(data.depth)
                                eqMessage.originTime = data.shockTime
                                eqMessage.originTimeText = '時間: ' + eqMessage.originTime
                                eqMessage.magnitude = data.magnitude
                                eqMessage.magnitudeText = '規模: ' + fmtMag(eqMessage.magnitude)
                                eqMessage.maxIntensity = formatShindo(data.epiIntensity ?? data.maxIntensity, false) || '不明'
                                eqMessage.maxIntensityText = '預估最大震度: ' + eqMessage.maxIntensity
                                eqMessage.isWarn = getShindoRank(eqMessage.maxIntensity) >= 5
                                break
                        }
                        break
                    }
                    case 'ceaEew':{
                        switch(type) {
                            case 0:
                                eqMessage.id = data.EventID
                                eqMessage.isEew = true
                                eqMessage.reportNum = data.ReportNum
                                eqMessage.reportNumText = '第' + data.ReportNum + '报'
                                eqMessage.reportTime = data.ReportTime || data.OriginTime
                                eqMessage.titleText = '中国地震局地震预警'
                                eqMessage.hypocenter = data.HypoCenter
                                eqMessage.hypocenterText = '震中: ' + data.HypoCenter
                                eqMessage.lat = data.Latitude
                                eqMessage.lng = data.Longitude
                                eqMessage.depth = data.Depth ?? 10
                                eqMessage.depthText = '深度: ' + (data.Depth == null ? '不明' : data.Depth + 'km')
                                eqMessage.originTime = data.OriginTime
                                eqMessage.originTimeText = '发震时间: ' + eqMessage.originTime
                                eqMessage.magnitude = data.Magnitude
                                eqMessage.magnitudeText = '震级: ' + eqMessage.magnitude.toFixed(1)
                                eqMessage.maxIntensity = data.MaxIntensity ? data.MaxIntensity.toFixed(0) : calcCsisLevel(eqMessage.magnitude, eqMessage.depth, 0)
                                eqMessage.maxIntensityText = '预估最大烈度: ' + eqMessage.maxIntensity
                                eqMessage.isWarn = Number(eqMessage.maxIntensity) >= 6.5
                                break
                            case 1:
                                eqMessage.id = data.id || data.eventId
                                eqMessage.isEew = true
                                eqMessage.reportNum = data.updates
                                eqMessage.reportNumText = '第' + data.updates + '报'
                                eqMessage.reportTime = data.updateTime || data.createTime || data.shockTime
                                eqMessage.titleText = '中国地震局地震预警'
                                eqMessage.hypocenter = data.placeName
                                eqMessage.hypocenterText = '震中: ' + data.placeName
                                eqMessage.lat = data.latitude
                                eqMessage.lng = data.longitude
                                eqMessage.depth = data.depth ?? 10
                                eqMessage.depthText = '深度: ' + (data.depth == null ? '不明' : data.depth + 'km')
                                eqMessage.originTime = data.shockTime
                                eqMessage.originTimeText = '发震时间: ' + eqMessage.originTime
                                eqMessage.magnitude = data.magnitude
                                eqMessage.magnitudeText = '震级: ' + (eqMessage.magnitude == null ? '不明' : eqMessage.magnitude.toFixed(1))
                                eqMessage.maxIntensity = data.epiIntensity ? Number(data.epiIntensity).toFixed(0) : calcCsisLevel(eqMessage.magnitude, eqMessage.depth, 0)
                                eqMessage.maxIntensityText = '预估最大烈度: ' + eqMessage.maxIntensity
                                eqMessage.isWarn = Number(eqMessage.maxIntensity) >= 6.5
                                break
                        }
                        break
                    }
                    case 'iclEew':{
                        switch(type) {
                            case 1:
                                eqMessage.id = data.id || data.eventId
                                eqMessage.isEew = true
                                eqMessage.reportNum = data.updates
                                eqMessage.reportNumText = '第' + data.updates + '报'
                                eqMessage.reportTime = data.updateTime
                                eqMessage.titleText = '成都高新减灾研究所地震预警'
                                eqMessage.hypocenter = data.placeName
                                eqMessage.hypocenterText = '震中: ' + data.placeName
                                eqMessage.lat = data.latitude
                                eqMessage.lng = data.longitude
                                eqMessage.depth = data.depth || 10
                                eqMessage.depthText = '深度: ' + (data.depth ? data.depth.toFixed(0) + 'km' : '不明')
                                eqMessage.originTime = data.shockTime
                                eqMessage.originTimeText = '发震时间: ' + eqMessage.originTime
                                eqMessage.magnitude = data.magnitude
                                eqMessage.magnitudeText = '震级: ' + eqMessage.magnitude.toFixed(1)
                                eqMessage.maxIntensity = data.epiIntensity ? data.epiIntensity.toFixed(0) : calcCsisLevel(eqMessage.magnitude, eqMessage.depth, 0)
                                eqMessage.maxIntensityText = '预估最大烈度: ' + eqMessage.maxIntensity
                                eqMessage.isWarn = Number(eqMessage.maxIntensity) >= 6.5
                                break
                        }
                        break
                    }
                    case 'scEew':{
                        switch(type) {
                            case 0:
                                eqMessage.id = data.EventID.split('_')[0]
                                eqMessage.isEew = true
                                eqMessage.reportNum = data.ReportNum
                                eqMessage.reportNumText = '第' + data.ReportNum + '报'
                                eqMessage.reportTime = data.ReportTime
                                eqMessage.titleText = '四川地震局地震预警'
                                eqMessage.hypocenter = data.HypoCenter
                                eqMessage.hypocenterText = '震中: ' + data.HypoCenter
                                eqMessage.lat = data.Latitude
                                eqMessage.lng = data.Longitude
                                eqMessage.depth = data.Depth || 10
                                eqMessage.depthText = '深度: ' + (data.Depth ? data.Depth + 'km' : '不明')
                                eqMessage.originTime = data.OriginTime
                                eqMessage.originTimeText = '发震时间: ' + data.OriginTime
                                eqMessage.magnitude = data.Magunitude
                                eqMessage.magnitudeText = '震级: ' + data.Magunitude.toFixed(1)
                                eqMessage.maxIntensity = data.MaxIntensity ? data.MaxIntensity.toFixed(0) : calcCsisLevel(eqMessage.magnitude, eqMessage.depth, 0)
                                eqMessage.maxIntensityText = '预估最大烈度: ' + eqMessage.maxIntensity
                                eqMessage.isWarn = Number(eqMessage.maxIntensity) >= 6.5
                                break
                            case 1:
                                eqMessage.id = String(data.id || data.eventId || '').split('_')[0]
                                eqMessage.isEew = true
                                eqMessage.reportNum = data.updates
                                eqMessage.reportNumText = '第' + eqMessage.reportNum + '报'
                                eqMessage.reportTime = data.updateTime || data.createTime || data.shockTime
                                eqMessage.titleText = '四川地震局地震预警'
                                eqMessage.hypocenter = data.placeName
                                eqMessage.hypocenterText = '震中: ' + data.placeName
                                eqMessage.lat = data.latitude
                                eqMessage.lng = data.longitude
                                eqMessage.depth = data.depth ?? 10
                                eqMessage.depthText = '深度: ' + (data.depth == null ? '不明' : data.depth + 'km')
                                eqMessage.originTime = data.shockTime
                                eqMessage.originTimeText = '发震时间: ' + data.shockTime
                                eqMessage.magnitude = data.magnitude
                                eqMessage.magnitudeText = '震级: ' + (eqMessage.magnitude == null ? '不明' : eqMessage.magnitude.toFixed(1))
                                eqMessage.maxIntensity = data.epiIntensity ? Number(data.epiIntensity).toFixed(0) : calcCsisLevel(eqMessage.magnitude, eqMessage.depth, 0)
                                eqMessage.maxIntensityText = '预估最大烈度: ' + eqMessage.maxIntensity
                                eqMessage.isWarn = Number(eqMessage.maxIntensity) >= 6.5
                                break
                        }
                        break
                    }
                    case 'fjEew':{
                        switch(type) {
                            case 0:
                                eqMessage.id = data.EventID.split('_')[0]
                                eqMessage.isEew = true
                                eqMessage.reportNum = data.ReportNum
                                eqMessage.reportNumText = '第' + data.ReportNum + '报'
                                eqMessage.reportTime = data.ReportTime
                                eqMessage.titleText = '福建地震局地震预警'
                                eqMessage.hypocenter = data.HypoCenter
                                eqMessage.hypocenterText = '震中: ' + data.HypoCenter
                                eqMessage.lat = data.Latitude
                                eqMessage.lng = data.Longitude
                                eqMessage.depth = 10
                                eqMessage.depthText = '深度: 不明'
                                eqMessage.originTime = data.OriginTime
                                eqMessage.originTimeText = '发震时间: ' + data.OriginTime
                                eqMessage.magnitude = data.Magunitude
                                eqMessage.magnitudeText = '震级: ' + data.Magunitude.toFixed(1)
                                eqMessage.maxIntensity = calcCsisLevel(eqMessage.magnitude, eqMessage.depth, 0)
                                eqMessage.maxIntensityText = '预估最大烈度: ' + eqMessage.maxIntensity
                                eqMessage.isWarn = Number(eqMessage.maxIntensity) >= 6.5
                                break
                            case 1:
                                eqMessage.id = String(data.id || data.eventId || '').split('_')[0]
                                eqMessage.isEew = true
                                eqMessage.reportNum = data.updates
                                eqMessage.reportNumText = '第' + eqMessage.reportNum + '报'
                                eqMessage.reportTime = (data.sendtime || data.updateTime || data.createTime || data.shockTime || '').toString().slice(0, 19)
                                eqMessage.titleText = '福建地震局地震预警'
                                eqMessage.hypocenter = data.placeName
                                eqMessage.hypocenterText = '震中: ' + data.placeName
                                eqMessage.lat = data.latitude
                                eqMessage.lng = data.longitude
                                eqMessage.depth = data.depth ?? 10
                                eqMessage.depthText = '深度: ' + (data.depth == null ? '不明' : data.depth + 'km')
                                eqMessage.originTime = (data.shockTime || '').toString().slice(0, 19)
                                eqMessage.originTimeText = '发震时间: ' + eqMessage.originTime
                                eqMessage.magnitude = data.magnitude
                                eqMessage.magnitudeText = '震级: ' + (eqMessage.magnitude == null ? '不明' : Number(eqMessage.magnitude).toFixed(1))
                                eqMessage.maxIntensity = data.epiIntensity != null
                                    ? Number(data.epiIntensity).toFixed(0)
                                    : calcCsisLevel(eqMessage.magnitude, eqMessage.depth, 0)
                                eqMessage.maxIntensityText = '预估最大烈度: ' + eqMessage.maxIntensity
                                eqMessage.isWarn = Number(eqMessage.maxIntensity) >= 6.5
                                break
                        }
                        break
                    }
                    case 'kmaEew': {
                        eqMessage.id = data.id
                        eqMessage.isEew = true
                        eqMessage.intTitle = '최대예상진도'
                        eqMessage.reportNum = data.updates || 1
                        eqMessage.reportNumText = '제' + eqMessage.reportNum + '보'
                        eqMessage.reportTime = data.createTime || data.updateTime || data.shockTime
                        eqMessage.titleText = '기상청 지진 조기 경보'
                        eqMessage.hypocenter = data.placename_zh || data.placeName
                        eqMessage.hypocenterText = '위치: ' + eqMessage.hypocenter
                        eqMessage.lat = data.latitude
                        eqMessage.lng = data.longitude
                        eqMessage.depth = data.depth || 10
                        eqMessage.depthText = '깊이: ' + (data.depth ? data.depth + 'km' : '불명')
                        eqMessage.originTime = data.shockTime
                        eqMessage.originTimeText = '발생시각: ' + eqMessage.originTime
                        eqMessage.magnitude = data.magnitude
                        eqMessage.magnitudeText = '규모: ' + fmtMag(eqMessage.magnitude)
                        const kmaInt = data.epiIntensity ?? data.maxMMI ?? data.intensity
                        eqMessage.maxIntensity = kmaInt == null || kmaInt === '' ? '불명' : String(kmaInt)
                        eqMessage.maxIntensityText = '최대예상진도: ' + eqMessage.maxIntensity
                        eqMessage.isWarn = data.isWarn ?? Number(eqMessage.maxIntensity) >= 6.5
                        break
                    }
                    case 'saEew': {
                        eqMessage.id = data.id
                        eqMessage.isEew = true
                        eqMessage.timeZone = systemTimeZone
                        eqMessage.reportNum = data.updates || 1
                        eqMessage.reportNumText = '第' + eqMessage.reportNum + '报'
                        eqMessage.reportTime = data.createTime || data.shockTime
                        eqMessage.titleText = 'ShakeAlert地震预警'
                        eqMessage.hypocenter = data.placeName || getFEName(data.latitude, data.longitude) || '未知区域'
                        eqMessage.hypocenterText = '震中: ' + eqMessage.hypocenter
                        eqMessage.lat = data.latitude
                        eqMessage.lng = data.longitude
                        eqMessage.depth = data.depth ?? 10
                        eqMessage.depthText = '深度: ' + fmtDepthKm(eqMessage.depth)
                        eqMessage.originTime = data.shockTime
                        eqMessage.originTimeText = '发震时间: ' + eqMessage.originTime
                        eqMessage.magnitude = data.magnitude
                        eqMessage.magnitudeText = '震级: ' + fmtMag(eqMessage.magnitude)
                        eqMessage.maxIntensity = data.epiIntensity != null
                            ? Number(data.epiIntensity).toFixed(0)
                            : calcCsisLevel(eqMessage.magnitude, eqMessage.depth, 0)
                        eqMessage.maxIntensityText = '预估最大烈度: ' + eqMessage.maxIntensity
                        eqMessage.isWarn = Number(eqMessage.maxIntensity) >= 6.5
                        break
                    }
                    case 'earlyEstEew': {
                        eqMessage.id = data.id
                        eqMessage.isEew = true
                        eqMessage.timeZone = systemTimeZone
                        eqMessage.reportNum = data.updates || 1
                        eqMessage.reportNumText = '第' + eqMessage.reportNum + '报'
                        eqMessage.reportTime = data.createTime || data.shockTime
                        eqMessage.titleText = 'Early-est地震预警'
                        eqMessage.hypocenter = data.placeName || getFEName(data.latitude, data.longitude) || '未知区域'
                        eqMessage.hypocenterText = '震中: ' + eqMessage.hypocenter
                        eqMessage.lat = data.latitude
                        eqMessage.lng = data.longitude
                        eqMessage.depth = data.depth ?? 10
                        eqMessage.depthText = '深度: ' + fmtDepthKm(eqMessage.depth)
                        eqMessage.originTime = data.shockTime
                        eqMessage.originTimeText = '发震时间: ' + eqMessage.originTime
                        const earlyEstMag = Number(data.mb)
                        eqMessage.magnitude = Number.isFinite(earlyEstMag) ? earlyEstMag : 0
                        eqMessage.magnitudeText = '震级: ' + (Number.isFinite(earlyEstMag) ? `mb ${earlyEstMag.toFixed(1)}` : '不明')
                        eqMessage.maxIntensity = calcCsisLevel(eqMessage.magnitude, eqMessage.depth, 0)
                        eqMessage.maxIntensityText = '预估最大烈度: ' + eqMessage.maxIntensity
                        eqMessage.isWarn = Number(eqMessage.maxIntensity) >= 7.5
                        break
                    }
                    case 'gqEew':{
                        if(type == 1) {
                            // WHEWS /ws/gq · FormatGQWSData
                            const isNewEvent = eqMessage.id != data.id
                            eqMessage.id = data.id
                            eqMessage.type = data.quality ?? 9
                            eqMessage.isEew = true
                            eqMessage.timeZone = systemTimeZone
                            eqMessage.isCanceled = !!data.cancel
                            eqMessage.reportNum = eqMessage.isCanceled ? Infinity : (data.updates || 1)
                            eqMessage.reportNumText = eqMessage.isCanceled ? '取消报' : ('第' + eqMessage.reportNum + '报')
                            eqMessage.reportTime = data.updateTime || data.createTime || data.shockTime
                            eqMessage.titleText = 'GlobalQuake地震预警'
                            eqMessage.lat = data.latitude
                            eqMessage.lng = data.longitude
                            eqMessage.depth = data.depth
                            eqMessage.depthText = '深度: ' + fmtDepthKm(eqMessage.depth)
                            eqMessage.originTime = data.shockTime
                            eqMessage.originTimeText = '发震时间: ' + eqMessage.originTime
                            eqMessage.magnitude = data.magnitude
                            eqMessage.magnitudeText = '震级: ' + fmtMag(eqMessage.magnitude)
                            eqMessage.maxIntensity = data.intensity != null
                                ? String(data.intensity)
                                : calcCsisLevel(eqMessage.magnitude, eqMessage.depth, 0)
                            eqMessage.isWarn = Number(eqMessage.maxIntensity) >= 7.5
                            if(eqMessage.isCanceled) {
                                eqMessage.hypocenter = '已取消'
                                eqMessage.hypocenterText = '震中: 已取消'
                                eqMessage.maxIntensityText = '预估最大烈度: 无'
                            } else {
                                eqMessage.hypocenter = data.placeName || getFEName(data.latitude, data.longitude) || '未知区域'
                                eqMessage.hypocenterText = '震中: ' + eqMessage.hypocenter
                                eqMessage.maxIntensityText = '预估最大烈度: ' + eqMessage.maxIntensity
                            }
                            void isNewEvent
                            break
                        }
                        const isNewEvent = eqMessage.id != data.Id
                        eqMessage.id = data.Id
                        eqMessage.type = data.Quality?.QualityLevel ?? 9
                        eqMessage.isEew = true
                        eqMessage.timeZone = systemTimeZone
                        eqMessage.isCanceled = data.RevisionId < 0
                        if(!eqMessage.isCanceled || isNewEvent) {
                            eqMessage.reportNum = eqMessage.isCanceled ? Infinity : data.RevisionId
                            eqMessage.titleText = 'GlobalQuake地震预警'
                            eqMessage.lat = data.Latitude
                            eqMessage.lng = data.Longitude
                            eqMessage.depth = data.Depth
                            eqMessage.depthText = '深度: ' + (eqMessage.depth == null ? '不明' : eqMessage.depth.toFixed(0) + 'km')
                            eqMessage.originTime = stampToTime(new Date(data.OriginTime).getTime(), systemTimeZone)
                            eqMessage.originTimeText = '发震时间: ' + eqMessage.originTime
                            eqMessage.magnitude = data.Magnitude
                            eqMessage.magnitudeText = '震级: ' + (eqMessage.magnitude == null ? '不明' : eqMessage.magnitude.toFixed(1))
                            eqMessage.maxIntensity = calcCsisLevel(eqMessage.magnitude, eqMessage.depth, 0)
                            eqMessage.isWarn = Number(eqMessage.maxIntensity) >= 7.5
                        }
                        if(eqMessage.isCanceled) {
                            eqMessage.reportTime = stampToTime(Date.now(), systemTimeZone)
                            eqMessage.reportNumText = '取消报'
                            eqMessage.hypocenter = '已取消'
                            eqMessage.hypocenterText = '震中: 已取消'
                            eqMessage.maxIntensityText = '预估最大烈度: 无'
                        }
                        else{
                            eqMessage.reportTime = stampToTime(new Date(data.LastUpdatedTime).getTime(), systemTimeZone)
                            eqMessage.reportNumText = '第' + data.RevisionId + '报'
                            eqMessage.hypocenter = getFEName(data.Latitude, data.Longitude) || data.Region || '未知区域'
                            eqMessage.hypocenterText = '震中: ' + eqMessage.hypocenter
                            eqMessage.maxIntensityText = '预估最大烈度: ' + eqMessage.maxIntensity
                        }
                        break
                    }
                    case 'mockEew': {
                        Object.assign(eqMessage, data)
                        break
                    }
                    case 'jmaEqlist':{
                        if(type == 1) {
                            eqMessage.timeZone = 9
                            eqMessage.useShindo = true
                            eqMessage.id = data.id
                            eqMessage.isCanceled = !!data.cancel
                            eqMessage.originTime = data.shockTime
                            eqMessage.originTimeText = '検知時刻: ' + (data.shockTime || '調査中') + ' (JST)'
                            eqMessage.reportTime = data.updateTime || data.createTime || data.shockTime
                            eqMessage.title = data.title || data.infoTypeName || '地震情報'
                            eqMessage.titleText = eqMessage.title
                            eqMessage.hypocenter = data.placeName || '調査中'
                            eqMessage.hypocenterText = '震源地: ' + eqMessage.hypocenter
                            eqMessage.lat = data.latitude ?? null
                            eqMessage.lng = data.longitude ?? null
                            eqMessage.depth = data.depth ?? -1
                            eqMessage.depthText = '深さ: ' + (eqMessage.depth == -1 || eqMessage.depth == null ? '不明' : eqMessage.depth == 0 ? 'ごく浅い' : eqMessage.depth + 'km')
                            eqMessage.magnitude = data.magnitude ?? -1
                            eqMessage.magnitudeText = 'マグニチュード: ' + (eqMessage.magnitude == -1 || eqMessage.magnitude == null ? '不明' : eqMessage.magnitude.toFixed(1))
                            eqMessage.maxIntensity = data.maxIntensity || '不明'
                            eqMessage.maxIntensityText = '最大震度: ' + eqMessage.maxIntensity
                            eqMessage.warnArea = '[]'
                            break
                        }
                        const isNewEvent = eqMessage.id != data.earthquake.time.replace(/\//g, '-')
                        eqMessage.timeZone = 9
                        eqMessage.id = data.earthquake.time.replace(/\//g, '-')
                        eqMessage.useShindo = true
                        eqMessage.originTime = data.earthquake.time.replace(/\//g, '-')
                        eqMessage.originTimeText = '検知時刻: ' + data.earthquake.time.replace(/\//g, '-') + ' (JST)'
                        eqMessage.reportTime = data.issue.time.replace(/\//g, '-')
                        switch(data.issue.type) {
                            case 'ScalePrompt':
                                eqMessage.title = '震度速報'
                                eqMessage.titleText = '震度速報'
                                eqMessage.maxIntensity = getShindoFromInstShindo(data.earthquake.maxScale / 10, false)
                                eqMessage.maxIntensityText = '最大震度: ' + eqMessage.maxIntensity
                                eqMessage.warnArea = JSON.stringify(data.points.map(point => {
                                    const name = point.isArea ? point.addr : jmaSeisIntLoc[point.addr]?.sect
                                    const intensity = getShindoFromInstShindo(point.scale / 10, false)
                                    const className = setClassName(intensity, true)
                                    return {
                                        name,
                                        intensity,
                                        className
                                    }
                                }))
                                if(isNewEvent){
                                    eqMessage.hypocenter = ''
                                    eqMessage.hypocenterText = '震源地: 調査中'
                                    eqMessage.lat = null
                                    eqMessage.lng = null
                                    eqMessage.depth = -1
                                    eqMessage.depthText = '深さ: 調査中'
                                    eqMessage.magnitude = -1
                                    eqMessage.magnitudeText = 'マグニチュード: 調査中'
                                }
                                break
                            case 'Destination':
                                eqMessage.title = '震源に関する情報'
                                eqMessage.titleText = '震源に関する情報'
                                eqMessage.hypocenter = data.earthquake.hypocenter.name
                                eqMessage.hypocenterText = '震源地: ' + eqMessage.hypocenter
                                eqMessage.lat = data.earthquake.hypocenter.latitude
                                eqMessage.lng = data.earthquake.hypocenter.longitude
                                eqMessage.depth = data.earthquake.hypocenter.depth
                                eqMessage.depthText = '深さ: ' + (eqMessage.depth == 0 ? 'ごく浅い' : eqMessage.depth + 'km')
                                eqMessage.magnitude = data.earthquake.hypocenter.magnitude
                                eqMessage.magnitudeText = 'マグニチュード: ' + eqMessage.magnitude.toFixed(1)
                                if(isNewEvent){
                                    eqMessage.maxIntensity = '不明'
                                    eqMessage.maxIntensityText = '最大震度: 不明'
                                    eqMessage.warnArea = JSON.stringify(data.points.map(point => {
                                        const name = point.isArea ? point.addr : jmaSeisIntLoc[point.addr]?.sect
                                        const intensity = getShindoFromInstShindo(point.scale / 10, false)
                                        const className = setClassName(intensity, true)
                                        return {
                                            name,
                                            intensity,
                                            className
                                        }
                                    }))
                                }
                                break
                            default:
                                switch(data.issue.type) {
                                    case 'ScaleAndDestination':
                                        eqMessage.title = '震度・震源に関する情報'
                                        eqMessage.titleText = '震度・震源に関する情報'
                                        break
                                    case 'DetailScale':
                                        eqMessage.title = '各地の震度に関する情報'
                                        eqMessage.titleText = '各地の震度に関する情報'
                                        break
                                    case 'Foreign':
                                        eqMessage.title = '遠地地震に関する情報'
                                        eqMessage.titleText = '遠地地震に関する情報'
                                        break
                                    case 'Other':
                                        eqMessage.title = 'その他の情報'
                                        eqMessage.titleText = 'その他の情報'
                                        break
                                }
                                eqMessage.hypocenter = data.earthquake.hypocenter.name
                                eqMessage.hypocenterText = '震源地: ' + eqMessage.hypocenter
                                eqMessage.lat = data.earthquake.hypocenter.latitude
                                eqMessage.lng = data.earthquake.hypocenter.longitude
                                eqMessage.depth = data.earthquake.hypocenter.depth
                                eqMessage.depthText = '深さ: ' + (eqMessage.depth == -1 ? '不明' : eqMessage.depth == 0 ? 'ごく浅い' : eqMessage.depth + 'km')
                                eqMessage.magnitude = data.earthquake.hypocenter.magnitude
                                eqMessage.magnitudeText = 'マグニチュード: ' + (eqMessage.magnitude == -1 ? '不明' : eqMessage.magnitude.toFixed(1))
                                eqMessage.maxIntensity = data.earthquake.maxScale == -1 ? '不明' : getShindoFromInstShindo(data.earthquake.maxScale / 10, false)
                                eqMessage.maxIntensityText = '最大震度: ' + eqMessage.maxIntensity
                                eqMessage.warnArea = JSON.stringify(data.points.map(point => {
                                    const name = point.isArea ? point.addr : jmaSeisIntLoc[point.addr]?.sect
                                    const intensity = getShindoFromInstShindo(point.scale / 10, false)
                                    const className = setClassName(intensity, true)
                                    return {
                                        name,
                                        intensity,
                                        className
                                    }
                                }))
                                break
                        }
                        break
                    }
                    case 'cwaEqlist':{
                        eqMessage.useShindo = true
                        eqMessage.titleText = '中央氣象署地震報告'
                        switch(type) {
                            case 1: {
                                eqMessage.id = data.id
                                eqMessage.reportTime = dayjs(data.shockTime, 'YYYY-MM-DD HH:mm:ss').add(5, 'minutes').format('YYYY-MM-DD HH:mm:ss')
                                const start = data.placeName.indexOf('(位於')
                                const end = data.placeName.indexOf(')')
                                eqMessage.hypocenter = start == -1 || end == -1 || start + 3 >= end ? data.placeName : data.placeName.slice(start + 3, end)
                                eqMessage.hypocenterText = '震央: ' + eqMessage.hypocenter
                                eqMessage.lat = data.latitude
                                eqMessage.lng = data.longitude
                                eqMessage.depth = data.depth
                                eqMessage.depthText = '深度: ' + data.depth.toFixed(0) + 'km'
                                eqMessage.originTime = data.shockTime
                                eqMessage.originTimeText = '時間: ' + eqMessage.originTime
                                eqMessage.magnitude = data.magnitude
                                eqMessage.magnitudeText = '規模: ' + data.magnitude.toFixed(1)
                                eqMessage.maxIntensity = data.maxIntensity?.replace('級', '') || '不明'
                                eqMessage.maxIntensityText = '最大震度: ' + eqMessage.maxIntensity
                                break
                            }
                        }
                        break
                    }
                    case 'cencEqlist':{
                        switch(type) {
                            case 0: 
                                if(calcTimeDiff(data.No1.ReportTime, 8, eqMessage.reportTime, 8) < 30000)
                                    break
                                eqMessage.id = data.No1.EventID
                                eqMessage.reportTime = data.No1.ReportTime
                                eqMessage.title = `中国地震台网${data.No1.type == 'reviewed' ? '正式' : '自动'}测定`
                                eqMessage.titleText = eqMessage.title
                                eqMessage.hypocenter = data.No1.placeName
                                eqMessage.hypocenterText = '震中: ' + data.No1.placeName
                                eqMessage.lat = Number(data.No1.latitude)
                                eqMessage.lng = Number(data.No1.longitude)
                                eqMessage.depth = Number(data.No1.depth)
                                eqMessage.depthText = '深度: ' + data.No1.depth + 'km'
                                eqMessage.originTime = data.No1.time
                                eqMessage.originTimeText = '发震时间: ' + data.No1.time
                                eqMessage.magnitude = Number(data.No1.magnitude)
                                eqMessage.magnitudeText = '震级: ' + data.No1.magnitude
                                eqMessage.maxIntensity = calcCsisLevel(eqMessage.magnitude, eqMessage.depth, 0)
                                eqMessage.maxIntensityText = '预估最大烈度: ' + eqMessage.maxIntensity
                                break
                            case 1:
                                if(data.createTime && eqMessage.reportTime && calcTimeDiff(data.createTime, 8, eqMessage.reportTime, 8) < 30000)
                                    break
                                eqMessage.id = data.id || data.eventId
                                eqMessage.reportTime = data.createTime || data.shockTime
                                const infoTypeName = data.infoTypeName || ''
                                const cedingIndex = infoTypeName.indexOf('测定')
                                eqMessage.title = cedingIndex > 1
                                    ? `中国地震台网${infoTypeName.slice(cedingIndex - 2, cedingIndex)}测定`
                                    : `中国地震台网${infoTypeName || '地震'}测定`
                                eqMessage.titleText = eqMessage.title
                                eqMessage.hypocenter = data.placeName
                                eqMessage.hypocenterText = '震中: ' + data.placeName
                                eqMessage.lat = data.latitude
                                eqMessage.lng = data.longitude
                                eqMessage.depth = data.depth
                                eqMessage.depthText = '深度: ' + data.depth + 'km'
                                eqMessage.originTime = data.shockTime
                                eqMessage.originTimeText = '发震时间: ' + data.shockTime
                                eqMessage.magnitude = data.magnitude
                                eqMessage.magnitudeText = '震级: ' + Number(data.magnitude).toFixed(1)
                                eqMessage.maxIntensity = calcCsisLevel(eqMessage.magnitude, eqMessage.depth, 0)
                                eqMessage.maxIntensityText = '预估最大烈度: ' + eqMessage.maxIntensity
                                break
                        }
                        break
                    }
                    case 'kmaEqlist':{
                        eqMessage.timeZone = 9
                        eqMessage.intTitle = '최대진도'
                        eqMessage.id = data.id
                        eqMessage.reportTime = data.updateTime || data.createTime || data.shockTime
                        eqMessage.title = '기상청 지진 정보'
                        eqMessage.titleText = eqMessage.title
                        eqMessage.hypocenter = data.placename_zh || data.placeName
                        eqMessage.hypocenterText = '위치: ' + eqMessage.hypocenter
                        eqMessage.lat = data.latitude
                        eqMessage.lng = data.longitude
                        eqMessage.depth = data.depth || 10
                        eqMessage.depthText = '깊이: ' + (data.depth ? data.depth + 'km' : '불명')
                        eqMessage.originTime = data.shockTime
                        eqMessage.originTimeText = '발생시각: ' + eqMessage.originTime
                        eqMessage.magnitude = data.magnitude
                        eqMessage.magnitudeText = '규모: ' + fmtMag(eqMessage.magnitude)
                        const kmaListInt = data.epiIntensity ?? data.intensity ?? data.maxMMI
                        eqMessage.maxIntensity = kmaListInt == null || kmaListInt === '' ? '불명' : String(kmaListInt)
                        eqMessage.maxIntensityText = '최대진도: ' + eqMessage.maxIntensity
                        break
                    }
                    case 'usgsEqlist': {
                        const tempMsg = {}
                        eqMessage.timeZone = systemTimeZone
                        switch(type) {
                            case 0:
                                const { geometry, properties } = data
                                const [lng, lat, depth] = geometry.coordinates
                                tempMsg.id = properties.code
                                tempMsg.title = 'USGS' + (properties.status.toLowerCase() == 'reviewed' ? '正式' : '自动') + '测定'
                                tempMsg.titleText = tempMsg.title
                                tempMsg.hypocenter = getFEName(lat, lng) || properties.place
                                tempMsg.hypocenterText = '震中: ' + tempMsg.hypocenter
                                tempMsg.lat = lat
                                tempMsg.lng = lng
                                tempMsg.depth = depth
                                tempMsg.depthText = '深度: ' + tempMsg.depth.toFixed(0) + 'km'
                                tempMsg.originTime = stampToTime(properties.time, systemTimeZone)
                                tempMsg.originTimeText = '发震时间: ' + tempMsg.originTime
                                tempMsg.magnitude = properties.mag
                                tempMsg.magnitudeText = '震级: ' + tempMsg.magnitude.toFixed(1)
                                tempMsg.maxIntensity = calcCsisLevel(tempMsg.magnitude, tempMsg.depth, 0)
                                tempMsg.maxIntensityText = '预估最大烈度: ' + tempMsg.maxIntensity
                                if(isEqual(tempMsg, usgsCache))
                                    break
                                usgsCache = tempMsg
                                Object.assign(eqMessage, tempMsg)
                                eqMessage.reportTime = stampToTime(properties.updated, systemTimeZone)
                                break
                            case 1: {
                                const adapted = adaptWhewsInfo(data, { preferFeName: true })
                                tempMsg.id = adapted.id
                                tempMsg.title = `USGS${adapted.kind}`
                                tempMsg.titleText = tempMsg.title
                                tempMsg.hypocenter = adapted.hypocenter
                                tempMsg.hypocenterText = '震中: ' + tempMsg.hypocenter
                                tempMsg.lat = adapted.lat
                                tempMsg.lng = adapted.lng
                                tempMsg.depth = adapted.depth
                                tempMsg.depthText = '深度: ' + fmtDepthKm(tempMsg.depth)
                                tempMsg.originTime = adapted.originTime
                                tempMsg.originTimeText = '发震时间: ' + tempMsg.originTime
                                tempMsg.magnitude = adapted.magnitude
                                tempMsg.magnitudeText = '震级: ' + fmtMag(tempMsg.magnitude)
                                tempMsg.maxIntensity = adapted.maxIntensity
                                tempMsg.maxIntensityText = '预估最大烈度: ' + tempMsg.maxIntensity
                                if(isEqual(tempMsg, usgsCache))
                                    break
                                usgsCache = tempMsg
                                Object.assign(eqMessage, tempMsg)
                                eqMessage.reportTime = adapted.reportTime
                                break
                            }
                        }
                        break
                    }
                    case 'emscEqlist':
                    case 'hkoEqlist':
                    case 'bmkgEqlist':
                    case 'gfzEqlist':
                    case 'geonetEqlist':
                    case 'beijingEqlist':
                    case 'yunnanEqlist':
                    case 'ningxiaEqlist':
                    case 'tmdEqlist':
                    case 'uspEqlist':
                    case 'ingvEqlist':
                    case 'bcsfEqlist':
                    case 'nrcanEqlist':
                    case 'mmdEqlist':
                    case 'phivolcsEqlist':
                    case 'gaEqlist':
                    case 'cenaisEqlist':
                    case 'gsrasEqlist':
                    case 'bgsEqlist':
                    case 'ipmaEqlist':
                    case 'ssnEqlist':
                    case 'afadEqlist':
                    case 'sedEqlist':
                    case 'noaEqlist':
                    case 'scsnEqlist':
                    case 'iagEqlist':
                    case 'igpEqlist':
                    case 'nepalEqlist':
                    case 'cencIntEqlist': {
                        const meta = whewsEqlistMeta[source]
                        const adapted = adaptWhewsInfo(data)
                        eqMessage.timeZone = systemTimeZone
                        eqMessage.id = adapted.id
                        eqMessage.reportTime = adapted.reportTime
                        eqMessage.title = `${meta?.label || source}${adapted.kind}`
                        eqMessage.titleText = eqMessage.title
                        eqMessage.hypocenter = adapted.hypocenter
                        eqMessage.hypocenterText = '震中: ' + eqMessage.hypocenter
                        eqMessage.lat = adapted.lat
                        eqMessage.lng = adapted.lng
                        eqMessage.depth = adapted.depth
                        eqMessage.depthText = '深度: ' + fmtDepthKm(eqMessage.depth)
                        eqMessage.originTime = adapted.originTime
                        eqMessage.originTimeText = '发震时间: ' + eqMessage.originTime
                        eqMessage.magnitude = adapted.magnitude
                        eqMessage.magnitudeText = '震级: ' + fmtMag(eqMessage.magnitude)
                        eqMessage.maxIntensity = adapted.maxIntensity
                        eqMessage.maxIntensityText = '预估最大烈度: ' + eqMessage.maxIntensity
                        break
                    }
                }
                eqMessage.className = setClassName(eqMessage.maxIntensity, eqMessage.useShindo, eqMessage.isCanceled)
            } catch(err) {
                console.log(err);
            }
        },
        setTsunamiMessage(source, data) {
            try{
                const tsunamiMessage = this.tsunamiMessage[source]
                tsunamiMessage.source = source
                switch(source){
                    case 'jmaTsunami': {
                        const reportTime = data.issue.time.replace(/\//g, '-')
                        if(!tsunamiMessage.reportTime || calcTimeDiff(reportTime, 9, tsunamiMessage.reportTime, 9) > 0) {
                            tsunamiMessage.id = data.issue.time.replace(/[^0-9]/g, '')
                            tsunamiMessage.timeZone = 9
                            tsunamiMessage.reportTime = reportTime
                            if(data.cancelled) {
                                tsunamiMessage.title = '津波警報・注意報なし'
                                tsunamiMessage.titleText = '津波警報・注意報なし'
                                tsunamiMessage.status = 0
                                tsunamiMessage.className = 'gray'
                            }
                            else {
                                switch(data.areas[0].grade) {
                                    case 'Watch':
                                        tsunamiMessage.title = '津波注意報'
                                        tsunamiMessage.titleText = '津波注意報発表中'
                                        tsunamiMessage.status = 1
                                        tsunamiMessage.className = 'yellow'
                                        break
                                    case 'Warning':
                                        tsunamiMessage.title = '津波警報'
                                        tsunamiMessage.titleText = '津波警報発表中'
                                        tsunamiMessage.status = 2
                                        tsunamiMessage.className = 'red'
                                        break
                                    case 'MajorWarning':
                                        tsunamiMessage.title = '大津波警報'
                                        tsunamiMessage.titleText = '大津波警報発表中'
                                        tsunamiMessage.status = 3
                                        tsunamiMessage.className = 'purple'
                                        break
                                }    
                            }
                            tsunamiMessage.warnArea = JSON.stringify(data.areas.map(item => {
                                let className = 'gray'
                                switch(item.grade) {
                                    case 'Watch':
                                        className = 'yellow'
                                        break
                                    case 'Warning':
                                        className = 'red'
                                        break
                                    case 'MajorWarning':
                                        className = 'purple'
                                        break
                                }
                                return {
                                    name: item.name,
                                    grade: item.grade,
                                    height: item.maxHeight?.value,
                                    description: item.maxHeight.description,
                                    arrivalTime: item.firstHeight?.arrivalTime,
                                    condition: item.firstHeight?.condition,
                                    className
                                }
                            }))
                        }
                        this.isActive.jmaTsunami = !!tsunamiMessage.status
                        break
                    }
                    case 'nmefcTsunami': {
                        const reportTime = data.timeInfo.updateDate
                        if(!tsunamiMessage.reportTime || calcTimeDiff(reportTime, 8, tsunamiMessage.reportTime, 8) > 0) {
                            tsunamiMessage.id = data.timeInfo.updateDate.replace(/[^0-9]/g, '')
                            tsunamiMessage.reportTime = reportTime
                            switch(data.warningInfo.level) {
                                case '黄色':
                                    tsunamiMessage.title = '海啸注意报'
                                    tsunamiMessage.titleText = '现正发布海啸注意报'
                                    tsunamiMessage.status = 1
                                    tsunamiMessage.className = 'yellow'
                                    break
                                case '橙色':
                                    tsunamiMessage.title = '海啸警报'
                                    tsunamiMessage.titleText = '现正发布海啸警报'
                                    tsunamiMessage.status = 2
                                    tsunamiMessage.className = 'red'
                                    break
                                case '红色':
                                    tsunamiMessage.title = '大海啸警报'
                                    tsunamiMessage.titleText = '现正发布大海啸警报'
                                    tsunamiMessage.status = 3
                                    tsunamiMessage.className = 'purple'
                                    break
                                default:
                                    tsunamiMessage.title = '海啸预警已解除'
                                    tsunamiMessage.titleText = '海啸预警已解除'
                                    tsunamiMessage.status = 0
                                    tsunamiMessage.className = 'gray'
                                    break
                            }    
                            tsunamiMessage.warnArea = JSON.stringify(data.forecasts.map(item => {
                                let className = 'gray'
                                let height = 0
                                let description = ''
                                switch(item.warningLevel) {
                                    case '黄色':
                                        className = 'yellow'
                                        height = 1
                                        description = '1m'
                                        break
                                    case '橙色':
                                        className = 'red'
                                        height = 3
                                        description = '3m'
                                        break
                                    case '红色':
                                        className = 'purple'
                                        height = 5
                                        description = '3m超'
                                        break
                                }
                                return {
                                    name: item.forecastArea,
                                    grade: item.warningLevel,
                                    height,
                                    description,
                                    arrivalTime: item.estimatedArrivalTime,
                                    className
                                }
                            }))
                        }
                        this.isActive.nmefcTsunami = !!tsunamiMessage.status
                        break
                    }
                    case 'cwaTsunami':
                    case 'ntwcTsunami':
                    case 'ptwcTsunami':
                    case 'incoisTsunami':
                    case 'catTsunami': {
                        const reportTime = data.updateTime || data.createTime || data.time || data.issueTime || ''
                        const title = data.title || data.headline || data.warningInfo?.level || source
                        tsunamiMessage.id = String(data.id || reportTime || Date.now())
                        tsunamiMessage.reportTime = reportTime
                        tsunamiMessage.title = String(title)
                        tsunamiMessage.titleText = tsunamiMessage.title
                        const level = String(data.level || data.warningInfo?.level || data.status || '').toLowerCase()
                        if(/cancel|解除|none|0/.test(level) || data.cancelled) {
                            tsunamiMessage.status = 0
                            tsunamiMessage.className = 'gray'
                        } else if(/major|大|red|3|紫/.test(level)) {
                            tsunamiMessage.status = 3
                            tsunamiMessage.className = 'purple'
                        } else if(/warn|警|orange|2|红/.test(level)) {
                            tsunamiMessage.status = 2
                            tsunamiMessage.className = 'red'
                        } else if(/watch|注意|yellow|1|黄/.test(level)) {
                            tsunamiMessage.status = 1
                            tsunamiMessage.className = 'yellow'
                        } else {
                            tsunamiMessage.status = data.status != null ? Number(data.status) : 1
                            tsunamiMessage.className = tsunamiMessage.status >= 3 ? 'purple'
                                : tsunamiMessage.status >= 2 ? 'red'
                                : tsunamiMessage.status >= 1 ? 'yellow' : 'gray'
                        }
                        const areas = data.areas || data.forecasts || data.warnArea || []
                        tsunamiMessage.warnArea = JSON.stringify(Array.isArray(areas) ? areas : [])
                        this.isActive[source] = !!tsunamiMessage.status
                        break
                    }
                }
            } catch(err) {
                console.log(err);
            }
        },
        setHistory(source, data, api = '') {
            const list = []
            let keys
            switch (source) {
                case 'jmaEqlist':
                    keys = Object.keys(data).filter(key => /^No\d+$/.test(key))
                    break
                case 'cencEqlist':
                    keys = api == 'whews' ? Object.keys(data) : Object.keys(data).filter(key => /^No\d+$/.test(key))
                    break
                default:
                    keys = Object.keys(data)
                    break
            }
            for (let i = 0; i < keys.length; i++) {
                switch (source) {
                    case 'jmaEqlist': {
                        const item = data[keys[i]]
                        const id = item.EventID
                        const originTime = convertCompactTimeString(id) || item.time_full.replace(/\//g, '-')
                        list[i] = {
                            source: 'JMA',
                            id,
                            timeZone: 9,
                            useShindo: true,
                            originTime,
                            lat: Number(item.latitude),
                            lng: Number(item.longitude),
                            hypocenter: item.location,
                            depth: Number(item.depth.replace('km', '')),
                            magnitude: Number(item.magnitude) || 0,
                            maxIntensity: item.shindo,
                            className: setClassName(item.shindo, true),
                            url: `https://typhoon.yahoo.co.jp/weather/jp/earthquake/${id}.html`
                        }
                        break
                    }
                    case 'cwaEqlist': {
                        const placeName = data[i].placeName
                        const locStart = placeName.indexOf('(位於')
                        const locEnd = placeName.indexOf(')')
                        const hypocenter = locStart == -1 || locEnd == -1 || locStart + 3 >= locEnd ? placeName : placeName.slice(locStart + 3, locEnd)
                        const maxIntensity = formatShindo(data[i].maxIntensity)
                        list[i] = {
                            source: 'CWA',
                            id: `${data[i].id}${dayjs.utc(data[i].shockTime, 'YYYY-MM-DD HH:mm:ss').format('YYYYMMDDHHmmss')}`,
                            timeZone: 8,
                            useShindo: true,
                            originTime: data[i].shockTime,
                            lat: data[i].latitude,
                            lng: data[i].longitude,
                            hypocenter,
                            depth: data[i].depth,
                            magnitude: data[i].magnitude,
                            maxIntensity,
                            className: setClassName(maxIntensity, true),
                            url: 'https://scweb.cwa.gov.tw/zh-tw/earthquake/data'
                        }
                        break
                    }
                    case 'cencEqlist': {
                        const item = data[keys[i]]
                        const isWhews = api == 'whews'
                        const originTime = isWhews ? item.shockTime : item.time
                        const isReviewed = isWhews
                            ? String(item.infoTypeName || '').includes('正式')
                            : item.type == 'reviewed'
                        const depth = Number(item.depth)
                        const magnitude = Number(item.magnitude)
                        const maxIntensity = calcCsisLevel(magnitude, depth)
                        const intReportId = String(originTime || '').replace(/[^\d]/g, '')
                        list[i] = {
                            source: 'CENC',
                            id: isWhews ? (item.id || item.eventId) : item.EventID,
                            timeZone: 8,
                            useShindo: false,
                            originTime,
                            lat: Number(item.latitude),
                            lng: Number(item.longitude),
                            hypocenter: (isReviewed ? '' : '(A)') + item.placeName,
                            depth,
                            magnitude,
                            maxIntensity,
                            className: setClassName(maxIntensity, false),
                            url: 'https://www.ceic.ac.cn/',
                            intReportId: this.intReportIds.has(intReportId) ? intReportId : null
                        }
                        break
                    }
                    case 'usgsEqlist': {
                        const feature = data[i]
                        const { properties, geometry } = feature
                        const [lng, lat, depth] = geometry.coordinates
                        const magnitude = properties.mag
                        const maxIntensity = calcCsisLevel(magnitude, depth)
                        list[i] = {
                            source: 'USGS',
                            id: feature.id,
                            timeZone: systemTimeZone,
                            useShindo: false,
                            originTime: stampToTime(properties.time, systemTimeZone),
                            lat,
                            lng,
                            hypocenter: (properties.status.toLowerCase() == 'reviewed' ? '' : '(A)') + (getFEName(lat, lng) || properties.place),
                            depth,
                            magnitude,
                            maxIntensity,
                            className: setClassName(maxIntensity, false),
                            url: properties.url
                        }
                        break
                    }
                }
            }
            if(source == 'cencEqlist') {
                const cacheKey = api == 'whews' ? 'whews' : 'wolfx'
                if(api == 'whews' && list.length) {
                    const mergedCache = [...this.cencHistoryCache.whews]
                    for(const event of list) {
                        const idx = mergedCache.findIndex(e => e.id == event.id)
                        if(idx >= 0) mergedCache[idx] = event
                        else mergedCache.push(event)
                    }
                    mergedCache.sort((a, b) => timeToStamp(b.originTime, b.timeZone) - timeToStamp(a.originTime, a.timeZone))
                    this.cencHistoryCache.whews = mergedCache.slice(0, 50)
                }
                else {
                this.cencHistoryCache[cacheKey] = list
                }
                const whewsList = this.cencHistoryCache.whews
                const merged = [...whewsList]
                this.cencHistoryCache.wolfx.forEach(wolfxEvent => {
                    if(!whewsList.some(whewsEvent => isSameCencHistoryEvent(whewsEvent, wolfxEvent))) {
                        merged.push(wolfxEvent)
                    }
                })
                merged.sort((a, b) => timeToStamp(b.originTime, b.timeZone) - timeToStamp(a.originTime, a.timeZone))
                this.history[source] = merged
            }
            else if(list.length > 0)
                this.history[source] = list
        },        
        isWhewsPrimaryForeign() {
            const url = this.whewsAllSocket?.url || ''
            return url.startsWith(whewsForeign.ws)
        },
        closeWhewsCeaSocket() {
            if(this.whewsCeaSocket) {
                this.whewsCeaSocket.close()
                this.whewsCeaSocket = null
            }
        },
        connectWhewsCeaSocket(token) {
            if(!this.isApiEnabled('ceaEew', 'whews') || !token) {
                this.closeWhewsCeaSocket()
                return
            }
            // Only while connected to foreign /ws/all: domestic CEA merge stream
            if(!this.isWhewsPrimaryForeign()) {
                this.closeWhewsCeaSocket()
                return
            }
            if(this.whewsCeaSocket?.shouldConnect && this.whewsCeaSocket.socket
                && this.whewsCeaSocket.socket.readyState <= 1) return
            this.closeWhewsCeaSocket()
            const ceaUrl = whewsUrl(eqUrls.whews_cea_all, token)
            this.whewsCeaSocket = new WebSocketObj(ceaUrl)
            this.whewsCeaSocket.setMessageHandler((e) => this.handleWhewsMessage(e.data))
        },
        handleWhewsMessage(raw) {
            let parsed
            try {
                parsed = JSON.parse(raw)
            } catch (_) {
                return
            }
            if(Array.isArray(parsed)) {
                parsed.forEach(frame => this.handleWhewsFrame(frame))
                return
            }
            this.handleWhewsFrame(parsed)
        },
        handleWhewsFrame(data) {
            if(!data || typeof data !== 'object') return
            if(data.type == 'heartbeat' || data.type == 'pong') {
                if(Number.isFinite(data.timestamp)) {
                    useTimeStore().applyServerTimeMs(data.timestamp)
                }
                return
            }
            const srcKey = data.source
            if(!srcKey || data.Data == null) return
            const settingsStore = useSettingsStore()
            const Data = data.Data
            let source = whews2Source[srcKey]
            if(srcKey == 'cea') {
                if(settingsStore.mainSettings.provinceCeaEew) return
                if(!this.activeWhewsSources.includes('ceaEew')) return
                source = 'ceaEew'
            } else if(srcKey == 'cea-pr') {
                const provinceSource = whewsProvinceEew(Data.province || Data.placeName)
                if(provinceSource && this.activeWhewsSources.includes(provinceSource)) {
                    source = provinceSource
                } else if(settingsStore.mainSettings.provinceCeaEew && this.activeWhewsSources.includes('ceaEew')) {
                    source = 'ceaEew'
                } else {
                    return
                }
            }
            if(!source || !this.activeWhewsSources.includes(source)) return
            if(source.endsWith('Tsunami')) {
                if(source == 'nmefcTsunami' && Data.warningInfo?.level == '信息') return
                this.setTsunamiMessage(source, Data)
                return
            }
            this.setEqMessage(source, Data, 1)
            if(source == 'cencEqlist') this.setHistory(source, [Data], 'whews')
            else if(source == 'cwaEqlist' || whewsEqlistMeta[source]) {
                // Seed latest into history list for eqlist sources
                const stamp = timeToStamp(Data.shockTime, 8)
                const meta = whewsEqlistMeta[source]
                const isJma = source == 'jmaEqlist'
                const adapted = isJma ? null : adaptWhewsInfo(Data, { preferFeName: source == 'usgsEqlist' })
                const maxIntensity = isJma
                    ? (Data.maxIntensity || '不明')
                    : adapted.maxIntensity
                const entry = source == 'cwaEqlist' ? null : {
                    source: meta?.sourceTag || source.replace('Eqlist', '').toUpperCase(),
                    id: isJma ? Data.id : adapted.id,
                    timeZone: isJma ? 9 : systemTimeZone,
                    useShindo: isJma,
                    originTime: isJma ? Data.shockTime : adapted.originTime,
                    lat: isJma ? Number(Data.latitude) : adapted.lat,
                    lng: isJma ? Number(Data.longitude) : adapted.lng,
                    hypocenter: isJma ? (Data.placeName || '') : adapted.hypocenter,
                    depth: isJma ? Number(Data.depth) : adapted.depth,
                    magnitude: isJma ? Number(Data.magnitude) : adapted.magnitude,
                    maxIntensity,
                    className: setClassName(maxIntensity, isJma),
                    url: '',
                }
                if(source == 'cwaEqlist') this.setHistory(source, [Data])
                else if(entry && Number.isFinite(stamp)) {
                    const list = [...(this.history[source] || [])]
                    const idx = list.findIndex(e => e.id == entry.id)
                    if(idx >= 0) list[idx] = entry
                    else list.unshift(entry)
                    this.history[source] = list.slice(0, 50)
                }
            }
        },        
        connect(protocol){
            if(protocol == 'http'){
                let status = -1
                clearInterval(this.httpRequest)
                this.httpRequest = setInterval(async () => {
                    const stamp = Date.now()
                    status = (status + 1) % 60
                    const promises = this.enabledSource.map(async source=>{
                        if(source == 'jmaEqlist' && this.isApiEnabled(source, 'p2pquake') && status % 2 == 0 && (!this.eqMessage[source].id || status % 10 == 0)) {
                            const data = await Http.get(eqUrls.jmaEqlist_http)
                            if(data && data.length > 0) this.setEqMessage(source, data[0])
                        }
                        if(source == 'jmaTsunami' && this.isApiEnabled(source, 'p2pquake') && status % 2 == 1 && (!this.tsunamiMessage[source].id || status % 10 == 1)) {
                            const data = await Http.get(tsunamiUrls.jmaTsunami_http)
                            if(data && data.length > 0) this.setTsunamiMessage(source, data[0])
                        }
                    })
                    await Promise.all(promises)
                }, 1000);
            }
            else if(protocol == 'ws'){
                if(this.wolfxSocket) this.wolfxSocket.close()
                if(this.activeWolfxSources.length > 0) {
                    this.wolfxSocket = new WebSocketObj(eqUrls.wolfx_ws, this.activeWolfxSources.map(source => {
                        if(source == 'ceaEew') return 'query_cenceew'
                        else return `query_${source.toLowerCase()}`
                    }))
                    this.trackWebSocketStatus('wolfx', this.wolfxSocket)
                    this.wolfxSocket.setMessageHandler((e)=>{
                        const data = JSON.parse(e.data)
                        const source = wolfx2Source[data.type]
                        if(source && this.activeWolfxSources.includes(source)) {
                            switch(source) {
                                case 'jmaEqlist':
                                    this.setHistory(source, data)
                                    break
                                case 'cencEqlist':
                                    this.setEqMessage(source, data)
                                    this.setHistory(source, data, 'wolfx')
                                    break
                                default:
                                    this.setEqMessage(source, data)
                                    break
                            }
                        }
                    })
                }
                if(this.whewsAllSocket) this.whewsAllSocket.close()
                this.closeWhewsCeaSocket()
                if(this.activeWhewsSources.length > 0) {
                    const settingsStore = useSettingsStore()
                    const token = settingsStore.mainSettings.apiKeys.whewsToken?.trim()
                    if(!token) {
                        ElMessage({
                            message: '尚未配置 WHEWS Token，部分功能受限',
                            type: 'warning',
                            duration: 10000,
                            showClose: true
                        })
                        this.whewsAuthStatus = 0
                    }
                    const allUrls = [...eqUrls.whews_all].map(u => whewsUrl(u, token))
                    const preferDomestic = settingsStore.advancedSettings.defaultWhewsPreferForeign === false
                    if(preferDomestic && allUrls.length > 1) {
                        allUrls.unshift(...allUrls.splice(1, 1))
                    }
                    this.whewsAllSocket = new WebSocketObj(allUrls)
                    this.whewsAllSocket.setStateHandler((readyState, urlIndex) => {
                        Object.assign(this.webSocketStatus.whews, { readyState, urlIndex })
                        if(readyState == 1) {
                            this.whewsAuthStatus = token ? 1 : 0
                            if(this.isWhewsPrimaryForeign()) this.connectWhewsCeaSocket(token)
                            else this.closeWhewsCeaSocket()
                        }
                    })
                    this.whewsAllSocket.setUrlSwitchHandler(() => {
                        // Domestic /ws/all already includes CEA — drop cea_all to avoid duplicates
                        if(this.isWhewsPrimaryForeign()) this.connectWhewsCeaSocket(token)
                        else this.closeWhewsCeaSocket()
                    })
                    this.whewsAllSocket.setCloseHandler(() => {
                        this.whewsAuthStatus = -1
                        this.closeWhewsCeaSocket()
                    })
                    this.whewsAllSocket.setMessageHandler((e) => this.handleWhewsMessage(e.data))
                }
                if(this.p2pquakeSocket) this.p2pquakeSocket.close()
                if(this.activeP2pquakeSources.length > 0) {
                    this.p2pquakeSocket = new WebSocketObj(eqUrls.p2pquake_ws, ['ping'])
                    this.trackWebSocketStatus('p2pquake', this.p2pquakeSocket)
                    this.p2pquakeSocket.setMessageHandler((e)=>{
                        const data = JSON.parse(e.data)
                        switch(data.code) {
                            case 551:
                                if(this.activeP2pquakeSources.includes('jmaEqlist')) this.setEqMessage('jmaEqlist', data)
                                break
                            case 552:
                                if(this.activeP2pquakeSources.includes('jmaTsunami')) this.setTsunamiMessage('jmaTsunami', data)
                                break
                        }
                    })
                }
                if(this.gqSocket) this.gqSocket.close()
                this.gqSocket = null
                // GlobalQuake 仅直连（不再挂 WHEWS /ws/gq）
                if(this.isApiEnabled('gqEew', 'globalquake') && 'gqEew_ws' in eqUrls) {
                    this.gqSocket = new WebSocketObj(eqUrls.gqEew_ws, ['ping'])
                    this.trackWebSocketStatus('gq', this.gqSocket)
                    this.gqSocket.setMessageHandler((e)=>{
                        const data = JSON.parse(e.data)
                        if(data.RevisionId) this.setEqMessage('gqEew', data)
                    })
                }
            }
            else{
                console.log('Unrecognized protocol type.')
            }
        },
        getIrDetail(id) {
            // WHEWS has no FAN-style cencirdetail request over /ws/all
            void id
        },
        disconnect(){
            clearInterval(this.httpRequest)
            clearTimeout(this.wsConnectTimer)
            this.wsConnectTimer = null
            if(this.wolfxSocket) this.wolfxSocket.close()
            if(this.whewsAllSocket) this.whewsAllSocket.close()
            this.closeWhewsCeaSocket()
            if(this.p2pquakeSocket) this.p2pquakeSocket.close()
            if(this.gqSocket) this.gqSocket.close()
        },
        startUpdatingEqMessage(){
            this.connect('http')
            clearTimeout(this.wsConnectTimer)
            this.wsConnectTimer = setTimeout(() => {
                this.wsConnectTimer = null
                this.connect('ws')
            }, 500)
        },
        setActive(source, isActive){
            this.isActive[source] = isActive
        }
    }
})
