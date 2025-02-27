<script setup>
import { ref, onMounted, onBeforeUnmount, getCurrentInstance, watch } from 'vue';
import { Modal, Tabs, theme, Divider } from 'ant-design-vue';
import { KeyOutlined, SafetyCertificateOutlined, UserOutlined, GlobalOutlined } from '@ant-design/icons-vue';
import { xcopyText } from '@/utils/tool';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  certInfo: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['update:visible', 'close']);

const { useToken } = theme;
const { token } = useToken();

const visible = ref(false);
const certInfo = ref({});

// 监听visible变化
watch(() => props.visible, (val) => {
  visible.value = val;
});

// 监听certInfo变化
watch(() => props.certInfo, (val) => {
  certInfo.value = val;
});

// 关闭弹窗
const handleClose = () => {
  emit('update:visible', false);
  emit('close');
};

// 注册事件监听
const { proxy } = getCurrentInstance();
onMounted(() => {
  proxy.$eventBus.on("open-ssl-detail", (info) => {
    certInfo.value = info;
    visible.value = true;
  });
});

onBeforeUnmount(() => {
  proxy.$eventBus.off("open-ssl-detail");
});

// 复制文本
const copyText = (text, message) => {
  xcopyText(text, message);
};

// 获取证书类型的标签颜色
const getCertTypeColor = (type) => {
  switch (type) {
    case 'DV':
      return 'green';
    case 'OV':
      return 'blue';
    case 'EV':
      return 'purple';
    default:
      return 'default';
  }
};
</script>

<template>
  <Modal 
    v-model:visible="visible" 
    :title="null"
    :footer="null"
    :width="800"
    :bodyStyle="{ padding: '0' }"
    @cancel="handleClose"
    destroyOnClose
  >
    <div class="ssl-detail-container">
      <!-- 头部 -->
      <div class="ssl-detail-header" :style="{ backgroundColor: token.colorPrimary }">
        <div class="ssl-detail-header-icon">
          <SafetyCertificateOutlined />
        </div>
        <div class="ssl-detail-header-content">
          <h2>{{ certInfo.subject?.commonName || '证书详情' }}</h2>
          <div class="ssl-detail-header-tags">
            <a-tag :color="getCertTypeColor(certInfo.info?.cert_belong)">{{ certInfo.info?.cert_belong || '-' }}</a-tag>
            <a-tag>{{ certInfo.info?.certType || '-' }}</a-tag>
            <a-tag v-for="(purpose, index) in certInfo.info?.purposes" :key="index">{{ purpose }}</a-tag>
          </div>
        </div>
      </div>

      <!-- 内容区域 -->
      <div class="ssl-detail-content">
        <a-tabs default-active-key="1">
          <!-- 主题信息 -->
          <a-tab-pane key="1" tab="主题信息">
            <div class="ssl-detail-section">
              <div class="ssl-detail-section-header">
                <UserOutlined />
                <span>主题信息</span>
              </div>
              <div class="ssl-detail-grid">
                <div class="ssl-detail-label">通用名称(CN):</div>
                <div class="ssl-detail-value highlight">{{ certInfo.subject?.commonName || '-' }}</div>
                
                <div class="ssl-detail-label">国家(C):</div>
                <div class="ssl-detail-value">{{ certInfo.subject?.country || '-' }}</div>
                
                <div class="ssl-detail-label">省份(S):</div>
                <div class="ssl-detail-value">{{ certInfo.subject?.state || '-' }}</div>
                
                <div class="ssl-detail-label">城市(L):</div>
                <div class="ssl-detail-value">{{ certInfo.subject?.locality || '-' }}</div>
                
                <div class="ssl-detail-label">组织(O):</div>
                <div class="ssl-detail-value">{{ certInfo.subject?.organization || '-' }}</div>
                
                <div class="ssl-detail-label">部门(OU):</div>
                <div class="ssl-detail-value">{{ certInfo.subject?.organizationalUnit || '-' }}</div>
              </div>
            </div>

            <Divider />

            <div class="ssl-detail-section">
              <div class="ssl-detail-section-header">
                <GlobalOutlined />
                <span>签发者信息</span>
              </div>
              <div class="ssl-detail-grid">
                <div class="ssl-detail-label">通用名称(CN):</div>
                <div class="ssl-detail-value highlight">{{ certInfo.issuer?.commonName || '-' }}</div>
                
                <div class="ssl-detail-label">国家(C):</div>
                <div class="ssl-detail-value">{{ certInfo.issuer?.country || '-' }}</div>
                
                <div class="ssl-detail-label">组织(O):</div>
                <div class="ssl-detail-value">{{ certInfo.issuer?.organization || '-' }}</div>
              </div>
            </div>
          </a-tab-pane>

          <!-- 证书信息 -->
          <a-tab-pane key="2" tab="证书信息">
            <div class="ssl-detail-section">
              <div class="ssl-detail-section-header">
                <KeyOutlined />
                <span>证书信息</span>
              </div>
              <div class="ssl-detail-grid">
                <div class="ssl-detail-label">序列号:</div>
                <div class="ssl-detail-value copyable" @click="copyText(certInfo.info?.serialNumber, '序列号已复制')">
                  {{ certInfo.info?.serialNumber || '-' }}
                </div>
                
                <div class="ssl-detail-label">类别归档:</div>
                <div class="ssl-detail-value">
                  <a-tag :color="getCertTypeColor(certInfo.info?.cert_belong)">{{ certInfo.info?.cert_belong || '-' }}</a-tag>
                </div>
                
                <div class="ssl-detail-label">证书类型:</div>
                <div class="ssl-detail-value">{{ certInfo.info?.certType || '-' }}</div>
                
                <div class="ssl-detail-label">用途:</div>
                <div class="ssl-detail-value">
                  <a-tag v-for="(purpose, index) in certInfo.info?.purposes" :key="index" style="margin: 2px">
                    {{ purpose }}
                  </a-tag>
                </div>
                
                <div class="ssl-detail-label">密钥类型:</div>
                <div class="ssl-detail-value">{{ certInfo.info?.public_key || '-' }}</div>
                
                <div class="ssl-detail-label">密钥强度:</div>
                <div class="ssl-detail-value">{{ certInfo.info?.public_key_size || '-' }}</div>
                
                <div class="ssl-detail-label">签名算法:</div>
                <div class="ssl-detail-value">{{ certInfo.info?.signatureAlgorithm || '-' }}</div>
                
                <div class="ssl-detail-label">颁发时间:</div>
                <div class="ssl-detail-value">{{ certInfo.info?.notBefore || '-' }}</div>
                
                <div class="ssl-detail-label">过期时间:</div>
                <div class="ssl-detail-value">{{ certInfo.info?.notAfter || '-' }}</div>
                
                <div class="ssl-detail-label">有效期:</div>
                <div class="ssl-detail-value">{{ certInfo.info?.validity ? `${certInfo.info.validity} 天` : '-' }}</div>
                
                <div class="ssl-detail-label">SHA1指纹:</div>
                <div class="ssl-detail-value copyable" @click="copyText(certInfo.info?.sha1Fingerprint, 'SHA1指纹已复制')">
                  {{ certInfo.info?.sha1Fingerprint || '-' }}
                </div>
                
                <div class="ssl-detail-label">SHA2指纹:</div>
                <div class="ssl-detail-value copyable" @click="copyText(certInfo.info?.sha2Fingerprint, 'SHA2指纹已复制')">
                  {{ certInfo.info?.sha2Fingerprint || '-' }}
                </div>
                
                <div class="ssl-detail-label">签名信息:</div>
                <div class="ssl-detail-value copyable" @click="copyText(certInfo.info?.cer_signture, '签名信息已复制')">
                  {{ certInfo.info?.cer_signture || '-' }}
                </div>
              </div>
            </div>
          </a-tab-pane>

          <!-- 备用名 -->
          <a-tab-pane key="3" tab="备用名">
            <div class="ssl-detail-section">
              <div class="ssl-detail-section-header">
                <GlobalOutlined />
                <span>备用名</span>
              </div>
              <div class="ssl-detail-alt-names">
                <a-tag 
                  v-for="(name, index) in certInfo.info?.altNames" 
                  :key="index"
                  color="blue"
                  class="alt-name-tag"
                  @click="copyText(name, '域名已复制')"
                >
                  {{ name }}
                </a-tag>
                <div v-if="!certInfo.info?.altNames || certInfo.info.altNames.length === 0" class="empty-data">
                  暂无备用名
                </div>
              </div>
            </div>

            <Divider />

            <div class="ssl-detail-section">
              <div class="ssl-detail-section-header">
                <GlobalOutlined />
                <span>CA 信息</span>
              </div>
              <div class="ssl-detail-grid">
                <div class="ssl-detail-label">CA URL:</div>
                <div class="ssl-detail-value copyable" @click="copyText(certInfo.info?.caUrl, 'CA URL已复制')">
                  {{ certInfo.info?.caUrl || '-' }}
                </div>
                
                <div class="ssl-detail-label">OCSP URL:</div>
                <div class="ssl-detail-value copyable" @click="copyText(certInfo.info?.ocsp, 'OCSP URL已复制')">
                  {{ certInfo.info?.ocsp || '-' }}
                </div>
              </div>
            </div>
          </a-tab-pane>
        </a-tabs>
      </div>

      <!-- 底部 -->
      <div class="ssl-detail-footer">
        <a-button type="primary" @click="handleClose">关闭</a-button>
      </div>
    </div>
  </Modal>
</template>

<style scoped lang="scss">
.ssl-detail-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.ssl-detail-header {
  display: flex;
  align-items: center;
  padding: 20px;
  color: white;

  .ssl-detail-header-icon {
    font-size: 36px;
    margin-right: 16px;
  }

  .ssl-detail-header-content {
    flex: 1;

    h2 {
      margin: 0;
      color: white;
      font-size: 20px;
      font-weight: 500;
      margin-bottom: 8px;
      word-break: break-all;
    }

    .ssl-detail-header-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
  }
}

.ssl-detail-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  max-height: 60vh;

  :deep(.ant-tabs-nav) {
    margin-bottom: 16px;
  }
}

.ssl-detail-section {
  margin-bottom: 24px;

  .ssl-detail-section-header {
    display: flex;
    align-items: center;
    font-size: 16px;
    font-weight: 500;
    margin-bottom: 16px;
    color: v-bind('token.colorTextHeading');

    .anticon {
      margin-right: 8px;
      font-size: 18px;
    }
  }
}

.ssl-detail-grid {
  display: grid;
  grid-template-columns: 120px 1fr;
  row-gap: 12px;
  column-gap: 16px;
}

.ssl-detail-label {
  color: v-bind('token.colorTextSecondary');
  font-size: 14px;
  line-height: 22px;
}

.ssl-detail-value {
  font-size: 14px;
  line-height: 22px;
  word-break: break-all;

  &.highlight {
    font-weight: 500;
    color: v-bind('token.colorTextHeading');
  }

  &.copyable {
    cursor: pointer;
    color: v-bind('token.colorPrimary');
    transition: opacity 0.2s;

    &:hover {
      opacity: 0.8;
    }
  }
}

.ssl-detail-alt-names {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 0;

  .alt-name-tag {
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
    }
  }

  .empty-data {
    color: v-bind('token.colorTextSecondary');
    font-size: 14px;
    padding: 16px 0;
    text-align: center;
    width: 100%;
  }
}

.ssl-detail-footer {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px;
  border-top: 1px solid v-bind('token.colorBorderSecondary');
}
</style> 