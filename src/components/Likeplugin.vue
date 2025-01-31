<script setup>
import {getRealThemeMode} from "@/utils/theme";
import {ref} from "vue";
import {goScore} from "@/utils/tool";

const zanshang = ref(false);

defineExpose({
    openZanshang: () => {
        zanshang.value = true;
    }
})
</script>

<template>
    <a-modal :footer="null" v-model:open="zanshang" title="发电不易，感谢支持！🤝🤝">
        <a-flex align="center" :gap="16">
            <img
                style="width: 200px; margin: 0 auto"
                :src="getRealThemeMode() === 'dark' ? 'img/black_code.jpg' : 'img/white_code.jpg'"
                alt=""
            >
            <div>
                <div style="height: 10px;"></div>
                <p>
                    如果您觉得插件对您有帮助，可以通过以下方式赞赏，您的支持是我继续开发的动力！
                </p>
                <p>
                    本插件承诺永久免费，但是您的赞赏是我继续开发的动力！
                </p>
                <a-flex justify="center" align="center">
                    <a-button @click="goScore('域名助手')">去插件页面赞赏</a-button>
                </a-flex>
            </div>
        </a-flex>
    </a-modal>
</template>

<style scoped lang="scss">

</style>