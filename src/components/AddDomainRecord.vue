<script setup>
import {ref, reactive, computed, watch} from "vue";
import {message, notification} from "ant-design-vue";
import {getDnsService} from "@/service/DnsService";
import {RecordTypes} from "@/utils/data";

const open = ref(false);
const confirmLoading = ref(false);
const emit = defineEmits(['refresh']);
const form = reactive({
    RecordId: "",
    SubDomain: "",
    RecordType: "A",
    Remark: "",
    Value: "",
    proxied: false // cloudflare 专属， 默认关闭 是否开启代理
})
const domainInfo = ref(null)


const existingRecordValues = {}
const valueAutoOptions = ref([])
const updateExistingValues = (existRecords) => {
    existRecords.forEach(record => {
        if (!existingRecordValues[record.Type]) {
            existingRecordValues[record.Type] = []
        }
        // 如果记录值不存在则添加
        if (!existingRecordValues[record.Type].includes(record.Value)) {
            existingRecordValues[record.Type].push(record.Value)
        }
    })
}

const openModal = (info, record = null, existRecords = []) => {
    domainInfo.value = info
    open.value = true;
    form.SubDomain = record?.Name || ""
    form.RecordType = record?.Type || "A"
    form.Value = record?.Value || ""
    form.Remark = record?.Remark || ""
    form.RecordId = record?.RecordId || ""
    form.proxied = record?.ProxyStatus || false
    // 初始化已存在的记录值
    updateExistingValues(existRecords)
    handleTypeChange(form.RecordType)
}

// 监听记录类型变化
const handleTypeChange = (value) => {
    form.RecordType = value
    valueAutoOptions.value = (existingRecordValues[value] || []).map(i => {
        return {
            value: i,
        }
    })
}

const filterOption = (input, option) => {
    return option.value.toLowerCase().indexOf(input.toLowerCase()) >= 0
}

defineExpose({
    openModal
})
const labelCol = {style: {width: '80px'}};
const wrapperCol = {};

const handleOk = () => {
    confirmLoading.value = true;
    if (!form.SubDomain) {
        message.error("请输入主机记录");
        confirmLoading.value = false;
        return;
    }
    if (!form.Value) {
        message.error("请输入记录值");
        confirmLoading.value = false;
        return;
    }

    // 检测域名及平台是否正确
    const dns = getDnsService(domainInfo.value.account_key,domainInfo.value.cloud, domainInfo.value.account_info.tokens);
    let baseParam = {
        value: form.Value,
        name: form.SubDomain,
        type: form.RecordType,
        remark: form.Remark,
        id: form.RecordId
    };
    if (domainInfo.value.cloud === 'cloudflare') {
        baseParam.proxied = form.proxied
    }
    if (form.RecordId) {
        dns.updateRecord(domainInfo.value.domain, baseParam).then(r => {
            open.value = false;
            message.success(`域名 ${domainInfo.value.domain} 修改解析记录成功`);
            // 通知刷新数据
            emit("refresh");
        }).catch(e => {
            notification.error({
                message: "修改解析记录失败",
                description: e.toString(),
                 duration: 10
            })
            console.error(e);
        }).finally(() => {
            confirmLoading.value = false;
        })
        return;
    }
    dns.addRecord(domainInfo.value.domain, baseParam).then(r => {
        open.value = false;
        message.success(`域名 ${domainInfo.value.domain} 添加解析记录成功`);
        // 通知刷新数据
        emit("refresh");
    }).catch(e => {
        notification.error({
            message: "添加解析记录失败",
            description: e.toString(),
             duration: 10
        })
    }).finally(() => {
        confirmLoading.value = false;
    })
};
</script>

<template>
    <a-modal v-model:open="open" :destroy-on-close="true" :confirm-loading="confirmLoading" @ok="handleOk" ok-text="保存" cancel-text="取消" width="450px">
        <template #title>
            <div style="text-align: center">
                {{form.RecordId ? '修改' : '添加'}}解析记录
            </div>
        </template>
        <div style="height: 20px;"></div>
        <a-form :label-col="labelCol" :model="form" :wrapper-col="wrapperCol">
            <a-form-item label="主机记录">
                <a-input v-model:value="form.SubDomain" placeholder="主机记录 @ 代表根域名">
                    <template #addonAfter>
                        .{{ domainInfo.domain }}
                    </template>
                </a-input>
            </a-form-item>
            <a-form-item label="记录类型">
                <a-select v-model:value="form.RecordType" @change="handleTypeChange">
                    <a-select-option v-for="(i, index) in RecordTypes" :key="index" :value="i">{{ i }}</a-select-option>
                </a-select>
            </a-form-item>
            <a-form-item label="　记录值">
                <a-auto-complete
                    v-model:value="form.Value"
                    :options="valueAutoOptions"
                    :filter-option="filterOption"
                    placeholder="记录值"
                ></a-auto-complete>
            </a-form-item>
            <a-form-item label="　　备注" v-if="!['aws', 'west'].includes(domainInfo.cloud)">
                <a-input v-model:value="form.Remark" placeholder="备注"></a-input>
            </a-form-item>
            <a-form-item label="开启代理" v-if="domainInfo.cloud === 'cloudflare'">
                <a-switch v-model:checked="form.proxied"></a-switch>
            </a-form-item>
        </a-form>
    </a-modal>
</template>

<style scoped lang="scss">

</style>