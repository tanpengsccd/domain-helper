import aliLogo from "@/assets/cloud/ali.png";
import cloudflareLogo from "@/assets/cloud/cloudflare.png";
import tencentLogo from "@/assets/cloud/tencent.png";
import huaweiLogo from "@/assets/cloud/huawei.png";
import awslogo from "@/assets/cloud/aws.png";
import volcengineLogo from "@/assets/cloud/volcengine.png";
import westLogo from "@/assets/cloud/west.png";
import spaceshipLogo from "@/assets/cloud/spaceship.png";

export const cloudsData = [
    {
        name: "",
        key: "ali",
        title: "阿里云",
        color: "#FF6A00",
        icon: aliLogo,
        tokens: [
            {
                key: "ID",
                value: ""
            },
            {
                key: "Secret",
                value: ""
            }
        ],
        columns: [
            {
                title: '备注',
                dataIndex: 'Remark',
                key: 'Remark',
                 align: 'center',
            },
            {
                title: '状态',
                dataIndex: 'Status',
                key: 'Status',
                width: 90,
                canEdit: true,
                align: 'center',
            },
        ],
    },
    {
        name: "",
        title: "腾讯云",
        key: "tencent",
        color: "#006EFF",
        icon: tencentLogo,
        tokens: [
            {
                key: "Secret ID",
                value: ""
            },
            {
                key: "Secret Key",
                value: ""
            }
        ],
        columns: [
            {
                title: '备注',
                dataIndex: 'Remark',
                key: 'Remark',
                 align: 'center',
            },
            {
                title: '状态',
                dataIndex: 'Status',
                width: 90,
                align: 'center',
                key: 'Status',
                canEdit: true,
            },
        ]
    },
    {
        name: "",
        title: "华为云",
        key: "huawei",
        icon: huaweiLogo,
        color: "#EA020A",
        tokens: [
            {
                key: "主账号",
                value: ""
            },
            {
                key: "IAM 账号",
                value: ""
            },
            {
                key: "IAM 账号密码",
                value: ""
            }
        ],
        columns: [
            {
                title: '备注',
                dataIndex: 'Remark',
                key: 'Remark',
                 align: 'center',
            },
            {
                title: '状态',
                dataIndex: 'Status',
                key: 'Status',
                width: 90,
                align: 'center',
                canEdit: true
            },
        ],
    },
    {
        name: "",
        title: "西部数码",
        key: "west",
        icon: westLogo,
        color: "#0080E3",
        tokens: [
            {
                key: "username",
                value: ""
            },
            {
                key: "api_password",
                value: ""
            }
        ],
        columns: [
            {
                title: '状态',
                dataIndex: 'Status',
                key: 'Status',
                width: 90,
                align: 'center',
                canEdit: true
            },
        ],
    },
    {
        name: "",
        title: "火山引擎",
        key: "volcengine",
        icon: volcengineLogo,
        color: "#1664FF",
        tokens: [
            {
                key: "Access Key ID",
                value: ""
            },
            {
                key: "Secret Access Key",
                value: ""
            }
        ],
        columns: [
            {
                title: '备注',
                dataIndex: 'Remark',
                key: 'Remark',
                 align: 'center',
            },
            {
                title: '状态',
                dataIndex: 'Status',
                width: 90,
                align: 'center',
                key: 'Status',
                canEdit: true
            },
        ],
    },
    {
        name: "",
        title: "CloudFlare",
        color: "#FF6633",
        key: "cloudflare",
        icon: cloudflareLogo,
        tokens: [
            {
                key: "EMAIL",
                value: ""
            },
            {
                key: "API Key",
                value: ""
            }
        ],
        columns: [
            {
                title: '备注',
                dataIndex: 'Remark',
                key: 'Remark',
                 align: 'center',
            },
            {
                title: '代理状态',
                dataIndex: 'ProxyStatus',
                key: 'ProxyStatus',
                width: 140,
                align: 'center',
            },
        ]
    },
    {
        name: "",
        title: "AWS",
        key: "aws",
        icon: awslogo,
        color: "#FF9900",
        tokens: [
            {
                key: "Access key ID",
                value: ""
            },
            {
                key: "Secret access key",
                value: ""
            }
        ]
    },
    {
        name: "",
        title: "spaceship",
        key: "spaceship",
        icon: spaceshipLogo,
        color: "#394EFF",
        tokens: [
            {
                key: "Key",
                value: ""
            },
            {
                key: "Secret",
                value: ""
            }
        ]
    }
]
//  "MX" 记录搁置
export const RecordTypes = [
    "A",
    "CNAME",
    "TXT", "AAAA", "NS",
]