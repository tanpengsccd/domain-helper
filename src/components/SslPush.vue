<script setup>
import {computed, ref, reactive, getCurrentInstance, onMounted, h, onBeforeUnmount} from "vue";
import {message, notification} from "ant-design-vue";
import confetti from 'canvas-confetti';
import {
    DownloadOutlined,
    QuestionCircleOutlined,
} from "@ant-design/icons-vue";
import {useThemeStore} from '@/stroes/themeStore.js';
import {SettingOutlined} from '@ant-design/icons-vue';
import {getAllPushplatform, getAllSslInfo, getAvailableSSL} from "@/utils/tool";
import router from "@/router";
import {PushServiceFactory} from "@/service/PushPlatform/PushService";
import {updateOneDomainMonitor} from "@/utils/sslMonitor.js";

const open = ref(false);
const successModal = ref(false);
const confirmLoading = ref(false);
const {proxy} = getCurrentInstance();

const form = reactive({
    platform: undefined,
    ssl: undefined,
})

const paltformInfo = reactive({
    _id: '',
    platform_type: "",
    tag: "",
    config: undefined
});
const sslInfo = ref(null);

const isDoing = ref(false);
const steps = ref([]);

const themeStore = useThemeStore();
const colorPrimary = computed(() => themeStore.themeColor);

const allPlatform = ref([]);
const allSSL = ref([])
const refreshPushplatform = () => {
    allPlatform.value = getAllPushplatform()
    console.log('allPlatform:', allPlatform.value)
}

const refreshAllSSL = () => {
    allSSL.value = getAvailableSSL();
}

onMounted(() => {
    proxy.$eventBus.on("open-ssl-push", openModal)
})

onBeforeUnmount(() => {
    proxy.$eventBus.off("open-ssl-push", openModal)
})

const pushRes = ref(null);

function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
}

const flowers = () => {
    let times = 0;
    let timer = setInterval(() => {
        confetti({
            zIndex: 8898989,
            angle: randomInRange(55, 125),
            spread: randomInRange(50, 70),
            particleCount: randomInRange(50, 100),
            origin: {y: 0.6},
            colors: [
                "#ff1744", "#d500f9", "#651fff", "#3d5afe",
                "#00e5ff", "#2196f3", "#00e676", "#ffea00",
                "#ff9100", "#ff3d00",
            ],
            shapes: ['square', 'circle', 'star']
        });
        times++;
        if (times >= 6) {
            clearInterval(timer)
            timer = null
        }
    }, 300)
}

const handleOk = async () => {


    // 判断是否选择了平台
    if (!form.platform) {
        message.error("请选择推送平台");
        return;
    }
    if (!paltformInfo._id) {
        message.error("请选择推送平台");
    }
    // 如果是ssh 必须有证书替换的路径
    if (paltformInfo.platform_type === 'ssh' && (!paltformInfo.config.certPath || !paltformInfo.config.keyPath)) {
        message.error("请填写证书路径");
        return;
    }
    if (!sslInfo.value) {
        throw new Error('证书信息不存在');
    }
    confirmLoading.value = true;
    isDoing.value = true;
    steps.value = [`推送证书到 ${paltformInfo.tag}`];
    try {
        // 这里应该添加实际的证书推送逻辑
        // 使用 sslInfo.value 中的证书信息
        const pushService = PushServiceFactory.getService(paltformInfo.platform_type);
        await pushService.validate(paltformInfo.config);
        pushRes.value = await pushService.push(paltformInfo.config, {
            cert: sslInfo.value.cert,
            key: sslInfo.value.key,
        }, (type, extData) => {
            switch (type) {
                case "error":
                    steps.value.push(`❌ ${extData.msg}`);
                    break;
                case "success":
                    steps.value.push(`✅ ${extData.msg}`);
                    break;
                case "connected":
                case "beforePush":
                case "afterPush":
                case "beforeCommand":
                case "afterCommand":
                    steps.value.push(extData.msg);
                    break;
                default:
                    steps.value.push(extData.msg);
                    break;
            }
        })
        steps.value.push('证书推送成功 🎉🎉');
        open.value = false;
        flowers();
        successModal.value = true;
        setTimeout(() => {
            updateOneDomainMonitor(sslInfo.value.subdomain);
        }, 3000)
    } catch (e) {
        notification.error({
            message: '证书推送失败',
            description: e.toString(),
            duration: 10
        });
    } finally {
        confirmLoading.value = false;
    }
};

const openModal = (ssl) => {
    // 判断是否有平台，没有的话跳转平台添加页面
    init();
    if (allPlatform.value.length === 0) {
        message.error("请先添加推送平台");
        return router.push({name: 'PushPlatform'});
    }
    if (ssl) {
        form.ssl = ssl._id;
        sslInfo.value = ssl;
    }
    // 默认选择第一个平台
    form.platform = allPlatform.value[0]._id;
    setPaltform();
    open.value = true;
}

const indicator = h(SettingOutlined, {
    style: {
        fontSize: '30px',
    },
    spin: true,
});


const setPaltform = () => {
    const platform = allPlatform.value.find(item => item._id === form.platform);
    paltformInfo._id = platform._id;
    paltformInfo.platform_type = platform.platform_type;
    paltformInfo.tag = platform.tag;
    paltformInfo.config = platform.config;
}

const init = () => {
    refreshAllSSL()
    refreshPushplatform()
    paltformInfo._id = '';
    form.platform = undefined;
    form.ssl = undefined;
    sslInfo.value = null;
    successModal.value = false;
    confirmLoading.value = false;
    isDoing.value = false;
    steps.value = [];
}

</script>

<template>
    <div class="push-container">
        <a-modal v-model:open="open" title="SSL证书推送" :cancel-button-props="{ disabled: confirmLoading }"
                 ok-text="开始推送"
                 cancel-text="取消" :confirm-loading="confirmLoading" @ok="handleOk" width="400px">
            <div style="height: 20px;"></div>
            <a-form :model="form" v-if="!isDoing">
                <a-form-item label="选择证书">
                    <a-select v-model:value="form.ssl" show-search>
                        <a-select-option v-for="item in allSSL" :key="item._id" :value="item._id">
                            {{ item.subdomain }}
                        </a-select-option>
                    </a-select>
                </a-form-item>
                <a-form-item label="推送平台">
                    <a-select v-model:value="form.platform" show-search @change="setPaltform">
                        <a-select-option v-for="item in allPlatform" :key="item._id" :value="item._id">
                            {{ item.platform_type }} - {{ item.tag }}
                        </a-select-option>
                    </a-select>
                </a-form-item>

                <template v-if="paltformInfo.platform_type === 'ssh'">
                    <a-form-item label="主机地址">
                        <a-input disabled :value="`${paltformInfo.config.host}:${paltformInfo.config.port}`"
                                 placeholder="请输入主机IP或域名"/>
                    </a-form-item>
                    <a-form-item label="证书路径">
                        <a-input v-model:value="paltformInfo.config.certPath" placeholder="证书存放路径，具体到文件"/>
                    </a-form-item>
                    <a-form-item label="私钥路径">
                        <a-input v-model:value="paltformInfo.config.keyPath" placeholder="私钥存放路径，具体到文件"/>
                    </a-form-item>
                    <a-form-item label="执行操作">
                        <a-input v-model:value="paltformInfo.config.restartCommand" placeholder="执行操作"/>
                    </a-form-item>
                </template>
                <template v-if="paltformInfo.platform_type === 'qiniu'">
                    <a-form-item label="CDN域名" extra="如果设置了该值，会尝试将证书直接绑定到该域名上">
                        <a-input v-model:value="paltformInfo.config.cdnDomain" placeholder="[选填] CDN域名"/>
                    </a-form-item>
                </template>
            </a-form>

            <div v-else>
                <p v-for="(i, index) in steps" :key="index" v-html="i"></p>
                <div style="width: 100%;text-align: center;padding-top: 20px;" v-if="confirmLoading">
                    <a-spin :indicator="indicator" tip="正在推送中，请勿退出程序"/>
                </div>
            </div>
        </a-modal>

        <a-modal v-model:open="successModal" :footer="false" width="400px">
            <template #title>
                <a-flex justify="center">
                    <a-typography-title :level="5">
                        🎉🎉证书推送成功🎉🎉
                    </a-typography-title>
                </a-flex>
            </template>

            <a-space direction="vertical">
                <div>证书已成功推送到 <span :style="{ color: colorPrimary }">{{ paltformInfo.tag }}</span></div>
                <template v-if="paltformInfo.platform_type === 'qiniu'">
                    <p v-html="pushRes.msg"></p>
                </template>
                <template v-if="paltformInfo.platform_type === 'ssh'">
                    <a-typography-text>证书文件路径: {{ paltformInfo.config?.certPath }}</a-typography-text>
                    <a-typography-text>私钥文件路径: {{ paltformInfo.config?.keyPath }}</a-typography-text>
                </template>
            </a-space>
        </a-modal>
    </div>
</template>

<style scoped lang="scss">
</style>