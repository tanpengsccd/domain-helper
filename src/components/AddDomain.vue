<script setup>
import {ref, reactive, getCurrentInstance} from "vue";
import {getAllAccount, getItem, getValidCloudData, saveDomain} from "@/utils/tool";
import {message, notification} from "ant-design-vue";
import {getDnsService} from "@/service/DnsService";
import router from "@/router";

const open = ref(false);
const confirmLoading = ref(false);

const {proxy} = getCurrentInstance();

const handleOk = () => {
    confirmLoading.value = true;
    // 检测域名是否合法 不带协议头的 主域名 支持双后缀
    if (!form.domain) {
        message.error("请输入主域名");
        confirmLoading.value = false;
        return;
    }
    if (!form.account_key) {
        message.error("请选择云平台账号");
        confirmLoading.value = false;
        return;
    }

    const cloudData = getItem(form.account_key);
    // 检测域名及平台是否正确
    const dns = getDnsService(form.account_key, form.cloud, cloudData.tokens);
    dns.checkDomain(form.domain).then(r => {
        confirmLoading.value = false;
        saveDomain(form.domain, form.cloud, {
            account_key: form.account_key,
            ...r
        });
        open.value = false;
        message.success(`域名 ${form.domain} 绑定成功`);
        // 通知刷新数据
         proxy.$eventBus.emit("refresh-domain-list")
    }).catch(e => {
        notification.error({
            message: '域名检测失败',
            description: e.toString(),
             duration: 10
        });
        confirmLoading.value = false;
    })
};
const validCloud = ref([])
validCloud.value = getValidCloudData()
const openModal = () => {
    confirmLoading.value = false;
    validCloud.value = getAllAccount()
    // // 初始化form
    form.domain = ""
    form.cloud = undefined
    form.account_key = undefined
    // 判断 是否有可用的云解析平台
    if (validCloud.value.length === 0) {
        message.error("请先添加云服务商账号");
        // 页面跳转
        router.push({name: 'AccountManage'});
        return;
    }
    open.value = true;
}
defineExpose({
    openModal
})
const labelCol = {style: {width: '50px'}, span: 5};
const form = reactive({
    domain: "",
    cloud: undefined,
    account_key: undefined,
})

const selectAccount = (id) => {
    form.account_key = id
    form.cloud = validCloud.value.find(i => i._id === id).cloud_key
}
</script>

<template>
    <a-modal v-model:open="open" title="手动添加域名" :confirm-loading="confirmLoading" @ok="handleOk" width="350px">
        <div style="height: 20px;"></div>
        <a-form :label-col="labelCol" :model="form">
            <a-form-item label="主域名">
                <a-input v-model:value="form.domain" placeholder="请输主域名 例：baidu.com"></a-input>
            </a-form-item>
            <a-form-item label="云平台">
                <a-select placeholder="请选择云平台账号" @change="selectAccount" v-model:value="form.account_key">
                    <a-select-option  v-for="i in validCloud" :key="i._id">
                        <a-space>
                            <a-image :preview="false" height="18px" :src="i.cloud_info.icon"></a-image>
                            {{ i.cloud_info.title }}-{{ i.tag }}
                        </a-space>
                    </a-select-option>
                </a-select>
            </a-form-item>
        </a-form>
    </a-modal>
</template>

<style scoped lang="scss">

</style>