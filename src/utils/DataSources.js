export const dataSourceCategories = [
    { key: 'eew', label: '地震预警' },
    { key: 'eqlist', label: '地震信息' },
    { key: 'tsunami', label: '海啸信息' },
]

export const dataSourceProviders = {
    wolfx: 'Wolfx',
    whews: 'WHEWS',
    p2pquake: 'P2PQ',
    globalquake: 'GQ',
}

/** WHEWS 地震情报源（统一帧格式，可勾选；默认全部启用以便历史筛选可用） */
const whewsEqlistEntries = [
    ['cwaEqlist', '臺灣中央氣象署: 地震報告', 1, true],
    ['cencEqlist', '中国地震台网: 地震测定', 0, true, ['wolfx', 'whews']],
    ['jmaEqlist', '日本気象庁: 地震情報', 2, true, ['wolfx', 'p2pquake', 'whews']],
    ['kmaEqlist', '기상청: 지진 정보', 3, true],
    ['usgsEqlist', 'USGS: 地震测定', 4, true],
    ['emscEqlist', 'EMSC: 地震测定', 5, true],
    ['hkoEqlist', '香港天文台: 地震信息', 6, true],
    ['bmkgEqlist', 'BMKG: 地震测定', 7, true],
    ['gfzEqlist', 'GFZ: 地震测定', 8, true],
    ['geonetEqlist', 'GeoNet: 地震测定', 9, true],
    ['tmdEqlist', 'TMD: 地震测定', 10, true],
    ['uspEqlist', 'USP: 地震测定', 11, true],
    ['ingvEqlist', 'INGV: 地震测定', 12, true],
    ['bcsfEqlist', 'BCSF: 地震测定', 13, true],
    ['nrcanEqlist', 'NRCan: 地震测定', 14, true],
    ['mmdEqlist', 'MMD: 地震测定', 15, true],
    ['phivolcsEqlist', 'PHIVOLCS: 地震测定', 16, true],
    ['gaEqlist', 'GA: 地震测定', 18, true],
    ['cenaisEqlist', 'CENAIS: 地震测定', 19, true],
    ['gsrasEqlist', 'GSRAS: 地震测定', 20, true],
    ['bgsEqlist', 'BGS: 地震测定', 21, true],
    ['ipmaEqlist', 'IPMA: 地震测定', 22, true],
    ['ssnEqlist', 'SSN: 地震测定', 23, true],
    ['afadEqlist', 'AFAD: 地震测定', 24, true],
    ['sedEqlist', 'SED: 地震测定', 25, true],
    ['noaEqlist', 'NOA: 地震测定', 26, true],
    ['scsnEqlist', 'SCSN: 地震测定', 27, true],
    ['iagEqlist', 'IAG: 地震测定', 28, true],
    ['igpEqlist', 'IGP: 地震测定', 29, true],
    ['nepalEqlist', 'NEPAL: 地震测定', 30, true],
    ['beijingEqlist', '北京地震局: 地震测定', 31, true],
    ['yunnanEqlist', '云南地震局: 地震测定', 32, true],
    ['ningxiaEqlist', '宁夏地震局: 地震测定', 33, true],
    ['cencIntEqlist', '中国地震台网: 烈度速报', 34, false],
]

const buildEqlistCatalog = () => Object.fromEntries(
    whewsEqlistEntries.map(([key, label, displayOrder, defaultEnabled, apis]) => [
        key,
        {
            label,
            category: 'eqlist',
            displayOrder,
            apis: apis || ['whews'],
            defaultEnabled: Boolean(defaultEnabled),
        },
    ])
)

export const dataSourceCatalog = {
    jmaEew: {
        label: '日本気象庁: 緊急地震速報',
        category: 'eew',
        displayOrder: 5,
        apis: ['wolfx', 'whews'],
        defaultEnabled: true,
    },
    cwaEew: {
        label: '臺灣中央氣象署: 強震即時警報',
        category: 'eew',
        displayOrder: 4,
        apis: ['wolfx', 'whews'],
        defaultEnabled: true,
    },
    ceaEew: {
        label: '中国地震局: 地震预警',
        category: 'eew',
        displayOrder: 0,
        apis: ['wolfx', 'whews'],
        defaultEnabled: true,
    },
    iclEew: {
        label: '成都高新减灾研究所: 地震预警',
        category: 'eew',
        displayOrder: 1,
        apis: ['whews'],
        requiredCapability: 'iclEew',
    },
    scEew: {
        label: '四川地震局: 地震预警',
        category: 'eew',
        displayOrder: 2,
        apis: ['wolfx', 'whews'],
        defaultEnabled: true,
    },
    fjEew: {
        label: '福建地震局: 地震预警',
        category: 'eew',
        displayOrder: 3,
        apis: ['wolfx', 'whews'],
        defaultEnabled: true,
    },
    kmaEew: {
        label: '기상청: 지진 조기 경보',
        category: 'eew',
        displayOrder: 6,
        apis: ['whews'],
        defaultEnabled: true,
    },
    saEew: {
        label: 'ShakeAlert: 地震预警',
        category: 'eew',
        displayOrder: 8,
        apis: ['whews'],
        defaultEnabled: true,
    },
    earlyEstEew: {
        label: 'Early-est: 地震预警',
        category: 'eew',
        displayOrder: 9,
        apis: ['whews'],
        defaultEnabled: true,
    },
    gqEew: {
        label: 'GlobalQuake: 地震预警',
        category: 'eew',
        displayOrder: 7,
        apis: ['globalquake'],
        requiredCapability: 'gqEew',
    },
    ...buildEqlistCatalog(),
    jmaTsunami: {
        label: '日本気象庁: 津波情報',
        category: 'tsunami',
        displayOrder: 1,
        apis: ['p2pquake', 'whews'],
    },
    nmefcTsunami: {
        label: '自然资源部: 海啸预警',
        category: 'tsunami',
        displayOrder: 0,
        apis: ['whews'],
        defaultEnabled: true,
    },
    cwaTsunami: {
        label: '臺灣中央氣象署: 海嘯警報',
        category: 'tsunami',
        displayOrder: 2,
        apis: ['whews'],
    },
    ntwcTsunami: {
        label: 'NTWC: 美国国家海啸预警',
        category: 'tsunami',
        displayOrder: 3,
        apis: ['whews'],
    },
    ptwcTsunami: {
        label: 'PTWC: 太平洋海啸预警',
        category: 'tsunami',
        displayOrder: 4,
        apis: ['whews'],
    },
    incoisTsunami: {
        label: 'INCOIS: 印度海啸预警',
        category: 'tsunami',
        displayOrder: 5,
        apis: ['whews'],
    },
    catTsunami: {
        label: 'CAT: 墨西哥海啸预警',
        category: 'tsunami',
        displayOrder: 6,
        apis: ['whews'],
    },
}

export const eewSources = Object.keys(dataSourceCatalog).filter(source => dataSourceCatalog[source].category == 'eew')
export const eqlistSources = Object.keys(dataSourceCatalog).filter(source => dataSourceCatalog[source].category == 'eqlist')
export const tsunamiSources = Object.keys(dataSourceCatalog).filter(source => dataSourceCatalog[source].category == 'tsunami')

export const wolfxSocketSources = Object.keys(dataSourceCatalog).filter(source => dataSourceCatalog[source].apis.includes('wolfx'))
export const whewsSocketSources = Object.keys(dataSourceCatalog).filter(source => dataSourceCatalog[source].apis.includes('whews'))
export const p2pquakeSocketSources = Object.keys(dataSourceCatalog).filter(source => dataSourceCatalog[source].apis.includes('p2pquake'))

export const createDefaultDataSources = () => Object.fromEntries(
    Object.entries(dataSourceCatalog).map(([source, config]) => [
        source,
        Object.fromEntries(config.apis.map(api => [api, Boolean(config.defaultEnabled)])),
    ])
)

/** Every catalog source is available via WHEWS (/ws/all or dedicated path), except GQ（仅直连）. */
export function ensureWhewsOnAllSources() {
    for (const [key, config] of Object.entries(dataSourceCatalog)) {
        if (key === 'gqEew') continue
        if (!config.apis.includes('whews')) config.apis = [...config.apis, 'whews']
    }
}
ensureWhewsOnAllSources()

/** 历史列表筛选：短名 → eqlist source key（须覆盖全部情报源，否则启动时会被滤掉） */
export const historySourceMap = {
    CENC: 'cencEqlist',
    CWA: 'cwaEqlist',
    JMA: 'jmaEqlist',
    KMA: 'kmaEqlist',
    USGS: 'usgsEqlist',
    EMSC: 'emscEqlist',
    HKO: 'hkoEqlist',
    BMKG: 'bmkgEqlist',
    GFZ: 'gfzEqlist',
    GeoNet: 'geonetEqlist',
    TMD: 'tmdEqlist',
    USP: 'uspEqlist',
    INGV: 'ingvEqlist',
    BCSF: 'bcsfEqlist',
    NRCAN: 'nrcanEqlist',
    MMD: 'mmdEqlist',
    PHIVOLCS: 'phivolcsEqlist',
    GA: 'gaEqlist',
    CENAIS: 'cenaisEqlist',
    GSRAS: 'gsrasEqlist',
    BGS: 'bgsEqlist',
    IPMA: 'ipmaEqlist',
    SSN: 'ssnEqlist',
    AFAD: 'afadEqlist',
    SED: 'sedEqlist',
    NOA: 'noaEqlist',
    SCSN: 'scsnEqlist',
    IAG: 'iagEqlist',
    IGP: 'igpEqlist',
    NEPAL: 'nepalEqlist',
    BJ: 'beijingEqlist',
    YN: 'yunnanEqlist',
    NX: 'ningxiaEqlist',
    CENC_INT: 'cencIntEqlist',
}

export const defaultHistorySources = Object.keys(historySourceMap)

/** Migrate legacy `fan` toggles → `whews` in saved settings. */
export function migrateFanDataSources(dataSources) {
    if (!dataSources || typeof dataSources !== 'object') return dataSources
    delete dataSources.fssnEqlist
    delete dataSources.sgcEqlist
    for (const [source, apis] of Object.entries(dataSources)) {
        if (!apis || typeof apis !== 'object') continue
        if (Object.hasOwn(apis, 'fan')) {
            if (!Object.hasOwn(apis, 'whews')) apis.whews = Boolean(apis.fan)
            delete apis.fan
        }
        // GQ 不再提供 WHEWS 勾选
        if (source === 'gqEew') delete apis.whews
        const catalog = dataSourceCatalog[source]
        if (catalog) {
            for (const key of Object.keys(apis)) {
                if (!catalog.apis.includes(key)) delete apis[key]
            }
            for (const api of catalog.apis) {
                if (!Object.hasOwn(apis, api)) apis[api] = Boolean(catalog.defaultEnabled)
            }
        }
        // 情报源若全部关闭，默认打开 WHEWS（否则历史筛选会整列变灰、列表只剩 USGS HTTP）
        if (catalog?.category === 'eqlist' && !Object.values(apis).some(Boolean) && catalog.apis.includes('whews')) {
            apis.whews = true
        }
        // WHEWS 全源可勾选（GQ 除外）
        if (source !== 'gqEew' && catalog?.apis.includes('whews') && !Object.hasOwn(apis, 'whews')) {
            apis.whews = Boolean(catalog.defaultEnabled)
        }
    }
    // 一次性：把旧版「默认关闭」的情报源打开 WHEWS，避免历史筛选灰掉、只剩 USGS HTTP
    try {
        const flag = 'kanameishi_eqlist_whews_defaults_v2'
        if (typeof localStorage !== 'undefined' && !localStorage.getItem(flag)) {
            for (const [source, apis] of Object.entries(dataSources)) {
                const catalog = dataSourceCatalog[source]
                if (!apis || catalog?.category !== 'eqlist' || !catalog.defaultEnabled) continue
                if (catalog.apis.includes('whews')) apis.whews = true
            }
            localStorage.setItem(flag, '1')
        }
    } catch (_) { /* ignore */ }
    return dataSources
}
