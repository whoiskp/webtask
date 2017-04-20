
'use latest';
import { fromExpress } from 'webtask-tools';

import express from 'express';
import logger from 'morgan';
import cors from 'cors';
import bodyParser from 'body-parser';
import request from 'request';
import rp from 'request-promise';
import cloudinary from 'cloudinary';

// var multer = require('multer');

cloudinary.config({
    cloud_name: 'whoiskp',
    api_key: '539946942382491',
    api_secret: '59RH1w8RTF_-6q27ALMhteZ6ayE'
});

let key = '9ec6c9eaac324270bb425d9ff59908cb';
let keyBingSearch = 'e2d93eb82fdb4c548602ff461034bdb2';

let idolPerson = [];

const app = express();

app.use(bodyParser.json());
app.use(logger('dev'));
app.use(cors());

app.get('/', function(req, res){
  var user = {
    "user4": {
        "name": "Nghia",
        "password": "123123",
        "job": "Dev",
        "id": 5
    }
  }
  res.end(JSON.stringify(user["user4"]));
});

app.get('/getListIdol', (req, res) =>{
   console.log(req.body.idols);
    let index = 1;
    let idolList = [];
    
    for (let i in idolPerson) {
        // let image = getImage(allIdols.idols[i].name);
        idolList.push({
            id: index++,
            name: idolPerson[i].name
        });
    }
    console.log(idolList);
  
  res.end(JSON.stringify(idolList));
});

app.post('/testImg', (req, res) =>{
  let img = req.body;
  cloudinary.uploader.upload(img, function (result) {
    console.log(result.url);
    recognize(result.url).then(result => {
    res.status(200).json(result);
  }).catch(err => {
    console.log(err);
    res.status(500).json(err);
  });
  });
});

app.post('/raw', (req, res) => {

  // output the headers
  console.log(req.headers);

  // capture the encoded form data
  req.on('data', (data) => {
    console.log(data.toString());
  });

  // send a response when finished reading
  // the encoded form data
  req.on('end', () => {
    res.send('ok');
  });
});


app.post('/', (req, res) => {
  let imageUrl = req.body.url;
  recognize(imageUrl).then(result => {
    res.status(200).json(result);
  }).catch(err => {
    console.log(err);
    res.status(500).json(err);
  });
});

app.post('/imageBase64', (req, res) => {
  let binData = req.body.binData;
  let url = "";
  cloudinary.uploader.upload(binData, function (result) {
    console.log(result.url);
    recognize(result.url).then(result => {
    res.status(200).json(result);
  }).catch(err => {
    console.log(err);
    res.status(500).json(err);
  });
  });
});


module.exports = fromExpress(app);

function detect(imageUrl) {
    console.log(`Begin to detect face from image: ${imageUrl}`);
    let url = `https://api.projectoxford.ai/face/v1.0/detect`;
    return rp({
        method: 'POST',
        uri: url,
        headers: {
            'Ocp-Apim-Subscription-Key': key
        },
        body: {
            url: imageUrl
        },
        json: true
    });
}

function identify(faceIds) {
    console.log(`Begin to identity face.`);
    let url = 'https://api.projectoxford.ai/face/v1.0/identify';
    return rp({
        method: 'POST',
        uri: url,
        headers: {
            'Ocp-Apim-Subscription-Key': key
        },
        body: {
            "personGroupId": 'whoiskp-idols',
            "faceIds": faceIds,
            "maxNumOfCandidatesReturned": 1,
        },
        json: true
    });
}

function mapResultToIdol(result, faces) {
      var allIdols = result.map(result => {

        // Lấy vị trí khuôn mặt trong ảnh để hiển thị
        result.face = faces.filter(face => face.faceId == result.faceId)[0].faceRectangle;
        
        // Tìm idol đã được nhận diện từ DB
        if (result.candidates.length > 0) {
            // Kết quả chỉ trả về ID, dựa vào ID này ta tìm tên của idol
            var idolId = result.candidates[0].personId;
            var idol = idolPerson.filter(person => person.personId == idolId)[0];
            result.idol = {
                id: idol.userData,
                name: idol.name
            };
        } else {
            result.idol = {
                id: 0,
                name: 'Unknown'
            }
        }
        
        return result;
    });

    console.log(`Finish recognize image.`);
    return allIdols;
}

// Nhận diện vị trí khuôn mặt và tên idol từ URL ảnh
function recognize(imageUrl) {
    console.log(`Begin to recognize image: ${imageUrl}`);
    let faces = [];
    return detect(imageUrl)
    .then(result => {
      faces = result;
      console.log(faces);
      return faces.map(face => face.faceId);
    })
    .then(identify)
    .then(identifiedResult => {
       return mapResultToIdol(identifiedResult, faces);
    });
}

// function getImage(strImg){
//   console.log(`Begin to get Image : ${strImg}`);
  
//   let url = `https://api.cognitive.microsoft.com/bing/v5.0/images/search?q=${strImg}&count=30`;
//   console.log(url);
//   return rp({
//         method: 'GET',
//         uri: url,
//         headers: {
//             'Ocp-Apim-Subscription-Key': keyBingSearch
//         },
//         json: true
//     });
// }

app.post('/addIdols', function (req, res) {
    console.log(req.body.idols);
    let index = 1;
    let idolWithImage = [];
    let allIdols = JSON.parse(JSON.stringify(req.body));
    console.log(allIdols);
    // // Lấy ảnh của mỗi idol trong danh sách
    for (let i in allIdols.idols) {
        // let image = getImage(allIdols.idols[i].name);
        idolWithImage.push({
            id: index++,
            name: allIdols.idols[i].name,
            userData: allIdols.idols[i].userData,
            // images: image
        });
    }
    console.log(idolWithImage);

    // // Tải dữ liệu về dưới dạng 
    res.end(JSON.stringify(idolWithImage));
});


// Thay bằng nội dung trong file idol-person.json của bạn
idolPerson = [
  {
    "personId": "16992c1a-92f0-4e25-bcab-6f187ffe37c6",
    "persistedFaceIds": [
      "0eef6aa6-3b93-4ebc-87e9-845c416374e9",
      "2c65b384-654c-49ed-80c6-3da317c8a95a",
      "36506fbe-655d-4a5b-9779-f239762a91db",
      "3b0af67b-6473-4284-a3a6-c4454afa1688",
      "4127b7ca-e047-4027-b3b9-f289a84eeb43",
      "41c8ee70-fb61-4809-a67a-1a06cc8ddbd1",
      "50b85aa9-bd3e-4dd9-9541-fbfcbb886425",
      "5d053dc6-b0e3-4ff0-87b5-6a9451a1378b",
      "781ce8e1-55fa-4fa2-a928-4c416a7071d6",
      "84015305-af2e-421c-8911-990ae72f78c7",
      "85882c97-2a90-41cb-8f15-f7700d90946a",
      "87543f2c-679f-43b5-b6d9-250a9d1cb3a0",
      "8a5bc4df-6c88-4e62-b8c2-dd643b22ee5c",
      "91256a22-07ab-4de6-afa2-a9b2f371de48",
      "a6080b6a-956b-4664-b1f4-91478ffb371a",
      "c431f58f-dd2b-4a24-9fb9-fc4988191484",
      "cf7ba739-84b4-4746-9cbe-1c3d4822d675",
      "dace441a-c068-4da1-81ee-17405abae5fb",
      "e1ee54dc-6052-4afe-aa7a-2517a1b0f3f6",
      "e59431af-059d-412f-91a2-30606fc2371f",
      "e97b1b0d-f020-4091-9cdb-b3ff6b0e52eb",
      "f5e3ea7b-c91c-4053-8444-c4748500aff8",
      "fd287a7c-a66e-42d4-b5b4-c7d851747997"
    ],
    "name": "Ngọc Trinh",
    "userData": "1"
  },
  {
    "personId": "46c4c26d-afe5-4deb-b0b1-4b8ba78801f7",
    "persistedFaceIds": [
      "03682495-87c2-4564-892f-6434188b960d",
      "0de3012f-bd22-466b-b136-9b5db526dbed",
      "1cbf1957-8dd5-4531-a1c3-80d5b06037ff",
      "261e74d5-5e7c-4d8f-b7cd-344257e9619e",
      "35f447d6-5e54-496b-9647-f7baf26c83d7",
      "3b64cae9-464d-45f4-a6fa-64d2d44da9bb",
      "5bc38067-a11f-4fca-9731-7962ba4ee8ca",
      "5f4f997b-aa71-456c-a8d6-249016f17957",
      "663339ce-862d-48e8-a27b-438b0b17f089",
      "69f7b275-6024-4068-b5f6-f57f2bc98f3b",
      "80144493-3c58-4217-8b1e-95273db73943",
      "9f4734a1-a6b8-4eab-8303-29585f1181ff",
      "a2c22317-3bef-4108-93e5-7f36f1515884",
      "a3c34497-278a-4c90-aca5-77b142d78dcf",
      "b013f1bf-a770-4c69-90d3-a4884920c650",
      "b04193c3-525e-49e5-af26-6607dcc37bd9",
      "b3501365-ad68-41a3-a9b8-599155040248",
      "b350194a-9252-4870-b600-c0135cefca80",
      "b621c256-52ad-4e6e-8ab9-fe55d662cbb2",
      "c14c4dcc-d6cd-4b1b-adff-27e015f3fe7c",
      "d4f79a91-6dbb-427f-8fc9-283870f4e999",
      "d5207621-2749-4e3e-9226-325637e7f3ff",
      "dddd0e74-7709-498e-a441-7c1195c20d01"
    ],
    "name": "Hoàng Thùy Linh",
    "userData": "4"
  },
  {
    "personId": "5dd473b2-bf23-4c56-bd76-db3d9cb377e1",
    "persistedFaceIds": [
      "20ed0c2e-ad28-44a6-a519-9a732582caf3",
      "284be139-02f9-485f-9b86-f5725cfd8238",
      "2b6a16b6-a1fa-4a8a-be2f-07e09aa85ca4",
      "393d1ad0-ab3b-4229-b5e2-ce1dce2c7f82",
      "4144f933-b66e-4fae-9837-3abe08bb4ac5",
      "47efe42d-ef52-46a3-867d-396703eb12d9",
      "4a7edede-d7d3-406a-82d7-1766b00c0e65",
      "519a58ae-b1e9-437f-8121-e89162d1dda1",
      "55a1c5d6-0d7a-4a1b-8c88-fc6f22e59998",
      "58fca6a5-dc25-4429-956a-1b6f2ad9a6cd",
      "5fb4c00f-32c1-43e0-9c1a-40544f85cf80",
      "7f2f97f8-6b6f-446f-85b3-00dd7c5e1823",
      "8b70e195-5f0c-452a-99a3-ce76a828e5e7",
      "907bc84d-eee4-41e7-9611-2182ecb1c270",
      "a401981c-5c53-4aa7-b67c-39a958eea932",
      "a5cf0015-d4b4-411e-b20b-3c37644f4655",
      "a78eb3c0-f016-42ff-9420-e1b219efa16c",
      "b1111b23-bd0e-4995-a3ae-3e775d2500b4",
      "b48eb2c4-ecc3-4a08-bc48-ebfb9d87e778",
      "bd811998-dffa-420d-b0b4-b8a8d511ce4c",
      "cea2a0ad-038b-4799-beb3-e4815049f1ea",
      "d93c58a7-07f9-4051-a1c6-2187b5faf503",
      "e1aecbf0-4fed-4492-a916-24f69f205f26",
      "e52a5d40-59d0-485c-8a3a-b20906e2d431"
    ],
    "name": "Hoàng Thùy Linh",
    "userData": "4"
  },
  {
    "personId": "6a2e179b-1bbd-4165-b805-d0bc4b8439d3",
    "persistedFaceIds": [
      "0956455f-b3d3-4fb8-8461-a9bd46412715",
      "0a1ba9e1-efc8-4c12-bd14-0c705b38ae61",
      "1bae868e-eece-4f45-a63d-e13685e779e7",
      "1f0be12a-0329-4cf5-a966-135a1c07d3f3",
      "2099b9a5-26ec-4689-b619-396583385192",
      "48294562-c82f-4069-ad34-68ffb2f7679a",
      "61f4f0ea-2a97-4b5e-bc6d-b7ca194fba86",
      "78108d4e-eee0-4d11-b9ca-d4012666117e",
      "abef636f-5257-4bae-9b04-c82fd2916896",
      "dc7cf811-8017-4520-b750-29adcd8f9e3f"
    ],
    "name": "Khả Ngân",
    "userData": "11"
  },
  {
    "personId": "88d6b1f5-5d7d-4bce-b7f6-66281eaefd15",
    "persistedFaceIds": [
      "043915e7-b603-4195-a654-158d4e30491b",
      "0f15f970-ca70-49ce-8340-ff6ef6a823b3",
      "1d3c560c-0fc0-496a-b006-31bf3a70979d",
      "44e3eedb-6cbc-4cd3-81b4-603a154186ba",
      "4aab9285-296e-4664-94a8-7e8984bd10e5",
      "5ed2bf60-4089-42b4-97e5-125eb3d97a47",
      "6c5749ad-5ae4-4ee8-b689-b6ec4753b1ff",
      "7368c7ee-0896-4db6-951a-d652b33454fc",
      "74533b3d-62b3-4fc8-b1a2-dbda45fa3ba5",
      "78d05647-12c4-492d-bdbb-ee1cfe51467b",
      "7ee22537-6c9a-4604-9eda-9852a7eb3d92",
      "82f3258e-10ab-4717-aba1-3169904ab228",
      "89bc29e6-27a5-4975-81d0-6222c6e2c140",
      "96b25d0c-ebea-46a8-b59b-eb22ad57099e",
      "b5694218-caf6-4059-90c9-93ce7b11618e",
      "b6a74a86-8fa8-4bc4-b35e-05953ebd2ee0",
      "ce44f5fe-f13d-40a3-8a5b-a362ebb5ad2b",
      "cf7608ee-0b7b-4684-bf95-1e4725dadf97",
      "e9b3dd2e-5c50-4cec-ae91-b8d5459ff760",
      "ed8e49ff-9b92-4072-bc1d-f1bf9cdb62b7",
      "f50515b9-9676-4ac2-965e-7230334a2151",
      "ff0dfd92-c679-4080-87cc-ab2f04a470be"
    ],
    "name": "Tâm Tít",
    "userData": "7"
  },
  {
    "personId": "9caa9f72-eba1-4889-8854-a529b10fd974",
    "persistedFaceIds": [
      "061597c2-b37c-4897-9850-f44ac9dfec70",
      "0842bdff-87d1-4a4f-aa77-7a5d378d8849",
      "11788595-04ef-4f55-a734-62b2aa86ba6a",
      "182b3522-d4b1-4e9d-8e39-7ff9dad89ce7",
      "2366b5ad-add1-48fe-a3e4-8da84bc200d4",
      "4fa2f833-cf92-4774-a1fb-18a778ee4b39",
      "5802b453-73a5-48b0-b014-ec8c3b796e2a",
      "5dbb0ac2-0648-44db-a646-68aa3b8337d5",
      "674ef1eb-4efd-42d2-a32c-0327d1875293",
      "67fb13b9-9e33-4dde-b2b4-fe65c2f743b0",
      "6abc7bce-35d9-400b-b385-7dea206a5b22",
      "7815ed3b-7a0f-4efe-87f4-761154626c03",
      "7f4f3a06-ad31-4e61-90a9-27e8d2106f5c",
      "8b11472d-0ecb-436e-8af4-27000e853c2d",
      "9e81d615-bc38-44ab-8e91-258c498fc7e7",
      "b786545d-3fe2-4708-b52a-c7f2a73f8435",
      "ea0cf621-00f5-4551-b3d6-9a028672dd2e",
      "f185d04a-a429-4a83-98a6-3b1666adf9f1",
      "f6dc87d5-2c35-4cde-b9d2-fc08056ef0dc",
      "fda21fc5-91f3-4e96-aa99-0756c536b148"
    ],
    "name": "Bà tưng",
    "userData": "2"
  },
  {
    "personId": "a8a3dedf-92c9-44c6-ab69-3585c5935a16",
    "persistedFaceIds": [
      "26a02f0a-76e5-4513-84b9-e3286fbbb34b",
      "3128722f-15eb-490a-b40f-5b3b92aef57d",
      "42d679b5-7e79-4b66-b8f9-7448b60369d7",
      "486b682c-c6b4-4285-a749-8a750f9aebe2",
      "4dfe9960-1320-4e78-9c0e-7363373d0929",
      "4f65f9f7-7ed5-4c01-816e-3d8e64f4e695",
      "59c6ed16-c319-41df-a9d0-cd78c83d8309",
      "60b69c92-81db-4f86-b6ae-5aaa1bed6fec",
      "6ad44073-998b-44b5-974d-0b613f1975b9",
      "77af5bfd-c393-4651-b755-c0fdffc77d15",
      "81488b4a-108b-46e2-a071-8d3e15501d63",
      "8301822b-add8-49fc-b3bc-dbcae70ddb30",
      "8f3b255c-3ca4-47ea-8bd8-d97c895ad95e",
      "a0cee775-2065-42cc-a862-97869b9ddab0",
      "a698c696-343c-4bc1-a464-ec2935cf0faa",
      "b888e268-33d6-4776-8334-52fe6ca9a3ae",
      "c04580b6-b3d6-4ee5-9652-6f13a780df3b",
      "c5012a24-ec96-470c-99a0-411c874cd94d",
      "e9a811e2-45d1-43f5-a982-00c395505bd0",
      "ee657bd5-0a02-4337-b4e0-b5507fb95a4e"
    ],
    "name": "Elly Trần",
    "userData": "5"
  },
  {
    "personId": "b36e41ed-0b4e-4a4c-95a8-4d3916609d29",
    "persistedFaceIds": [
      "04e04c1c-aba2-4099-936e-9bd56108d492",
      "19feec0f-f487-4390-a611-c0a0bf50cff8",
      "1b38ff4a-741c-41da-b4af-42e760d60bfe",
      "23ae0b1c-eeae-4f76-8f87-9567316701ce",
      "387d221d-8fff-495b-9be3-c6febe793c36",
      "470eab53-d852-4c5c-b29c-dd1e1337ea79",
      "4948fb5f-d394-41a5-8957-44e90a2b1415",
      "4af79679-116a-4f78-bb81-a88639973265",
      "545b1e1f-a112-49a6-9ae0-3a56237b55dc",
      "7eaedf06-b29a-4bea-bf4d-711b2c98b172",
      "7ec2d7af-1c34-4804-b15c-8171ad21c2b8",
      "8b145e86-2db9-464d-a24c-7627f36dbfce",
      "8da84b52-f604-4f4e-acbd-dc03375e3fd1",
      "ac9e9ebc-9157-4b98-b87f-76afd4350d11",
      "bd9fbf1a-9328-4816-a1bc-938433b42612",
      "c8bf78ce-ff72-4fc7-aaa8-251d126e6dfd",
      "d84c9366-4fac-4b2d-b20e-05eaa4da7323",
      "ec6aa37a-f354-483e-8959-29ea9a2d5609",
      "f45008aa-5702-4b5c-9e6e-9c40714ce8c4",
      "f464f530-58fa-4ba8-bc8a-a1d92d6fa573",
      "f965bf58-eabd-44d2-9719-e9fd9bac7df6"
    ],
    "name": "Chi Pu",
    "userData": "10"
  },
  {
    "personId": "c50d4e74-ded4-466d-b47c-62d7a2ee60da",
    "persistedFaceIds": [
      "0111b65a-62dd-4b78-8805-530e092d2e5e",
      "1595f1d0-7e35-43e1-9e01-e298276f5ecd",
      "19f08c96-436b-4f39-854d-475847d77543",
      "61ca970d-1ce1-4255-ba49-380bf2e71e5a",
      "7450ce70-6a88-4ecc-8387-ba94b9cd08ef",
      "7687c703-91ed-45c9-b885-3c9e91074a63",
      "8aec746d-c9aa-488d-a546-32b431cf573f",
      "994328d5-9559-4d5c-af62-39793cd439d6",
      "a0fc9009-b546-48f3-92c3-f8baeb59777e",
      "a109c18a-d24f-4e5a-81b3-77852131d3ff",
      "bf6414f9-3cd5-4b50-b53c-2b94ef1ecb39",
      "d8021452-e7e8-44e2-a6c4-3b5e7b6b109a",
      "de9b9b7e-e3f2-4977-9d45-e2eac0215e25",
      "dec0a629-246b-44cd-ad77-b01838e3070f",
      "e60a4259-3334-46e9-92d0-d21aad66468a"
    ],
    "name": "Thuỷ Top",
    "userData": "6"
  },
  {
    "personId": "d298e4ed-a167-4dbd-92e0-4052ac42cab6",
    "persistedFaceIds": [
      "007e57de-b7c5-4798-9df2-73276e52d5d7",
      "0f3edc94-e6ca-477e-b1e3-68a2c42e2af8",
      "0f5fdcd8-0633-4e9c-ab9f-75ddfc081d6d",
      "17fec9f9-0685-4c94-9c45-69a5890ce8b4",
      "2cae0e01-4252-41b9-9f9b-19416b8654c2",
      "3180280c-d948-476d-b03e-af00c4a9ac0c",
      "3a96090c-6d44-4816-afb8-354526eb4da2",
      "3c7c338d-ed2b-49c1-8da5-2dce3a4533bc",
      "4197d541-3651-4cfd-a773-c6c4b1c28289",
      "47b57572-db3f-4714-bc13-b09d49e1c357",
      "5517c9ba-ef3f-4e7a-892e-8bbfcb7635bb",
      "63b01c3f-96c7-44e1-867a-b0dcdcdbb197",
      "7b36544f-e73d-4e93-95aa-a12685253a70",
      "7e394c57-10f1-4461-b295-7f2b10b91392",
      "85c555ac-1a99-41c1-a0b7-5c41c4c3fbeb",
      "8ab1be7d-a7dd-40f8-9174-713a6f245f22",
      "9abec2a8-26ac-4289-97ef-38db9a1bdc0c",
      "9d4a3296-e70b-4072-8942-820e5c3a59c2",
      "a0869527-6754-455e-8d4c-7d842daf0f82",
      "a6b81e4b-6b35-4d56-af15-10ffa0611dbb",
      "a7d998a6-c29f-4136-b1fc-d2cac13caf69",
      "c715eb32-8551-4995-a626-9842e3f60c9f",
      "fe55c1eb-bf2d-4db8-aeb5-5d6894413679"
    ],
    "name": "Ngọc Trinh",
    "userData": "1"
  },
  {
    "personId": "d5bf00a7-266c-4db4-b5e5-4e778160a2ec",
    "persistedFaceIds": [
      "08f82ed7-480f-4521-a8fa-e4d65d2c5e9c",
      "0c808dea-9486-4ebe-8a26-6b0498d02410",
      "0ca59dbe-b128-4365-b699-63c4a59dd515",
      "45f0a2cc-ae86-4ea1-a3a8-a05ec47300b4",
      "56023fe7-b8de-4a51-b779-69aad64eea1a",
      "593587e4-839d-4d64-b098-9c72c8328ac7",
      "5cf4502e-3531-42ff-93be-174e35ec0733",
      "6f34d463-788f-4e7e-a59a-063dbf56dcc0",
      "77aa787d-c4a4-4332-9963-3bb228da9e03",
      "79d48ce2-1189-4cbf-93ae-f05173cc6336",
      "7e2fcb3b-3c39-43ad-9cd9-7da056d9827e",
      "8b7b3ce2-ebc1-4bdd-bc7b-a9118f8d6077",
      "9043f955-07b5-4149-af5e-7008f0a88442",
      "a2c51a88-07a0-4ed6-8455-e60ff0ad4a8e",
      "a63f3964-f132-4b8c-a9bd-747760587d16",
      "c00d1b2a-253c-4af6-b1af-9990d3686f76",
      "c1bf294f-0a87-4963-9746-5e9f5b1c88f6",
      "d6cc9f20-f3c8-4f94-8032-58e0fb7be3e1",
      "d7fe9783-0563-44f2-908e-2b6b4e0a4153",
      "dc64ece3-4833-496f-a064-0ad9770cafe0"
    ],
    "name": "Bà tưng",
    "userData": "2"
  },
  {
    "personId": "dd088bcf-6c09-40cf-b59d-c8999055a820",
    "persistedFaceIds": [
      "0e37e5a5-3cd9-4105-8b3f-135c5c60a242",
      "0ebba213-2e8c-4f0e-8432-3e55285c9d1c",
      "15b78d46-ea0e-4525-a0a3-f82947bf623f",
      "269c11d2-624e-41d6-9eb0-ceb7f8850cf2",
      "2c4b3a57-e3f5-42c9-b16a-e736d0d73715",
      "38c29c22-a002-4264-8bfc-de9ccf4d2c31",
      "3a17aee6-d493-46a4-a64f-8b2d82fceef3",
      "3c6f1c30-9815-45af-ab37-b776c16dcce1",
      "46770898-7925-49e3-8d8f-b1c3f2b19dd3",
      "54b09f55-d20e-4f5f-bcf9-436c215c1dd8",
      "65d90de4-a3d1-4b48-9840-5e91355bf8a9",
      "73932710-3020-499e-b0ac-a3b096dc7ba8",
      "84d4bc85-cdc6-4e1a-9f1f-8aae5e1d1141",
      "9bffccdf-1453-4f2a-a7fc-874bd55acda4",
      "9dbfd81b-9604-4215-b493-9e9a18bc3615",
      "a27939a3-6309-4abb-bcd2-9e86103337fd",
      "b236c3a2-8752-4576-a922-57631b599d2b",
      "b4628b81-8f3e-45b8-8168-e8b2a6497fe1",
      "d19d3505-0150-49d8-b896-b40922b0f08f",
      "d73136d0-6d6b-4eb6-a1c0-8cada520f9da",
      "dedddf8b-8b38-4553-bafa-6649e4716235",
      "e2fc36a2-73b5-4a80-a037-f625a7828244",
      "e563e974-4023-43c6-aa44-64690a5662b5",
      "f7651896-4b62-40ac-a6bd-99710a58a288",
      "fb3386ce-66b2-4917-9ef8-6a90eafbcf55"
    ],
    "name": "Miu Lê",
    "userData": "9"
  },
  {
    "personId": "ef9d32f5-85d6-42fe-be7d-0d4fd26ea449",
    "persistedFaceIds": [
      "03c6635e-8465-495a-bdf1-fd4d2c3b7c75",
      "08f874b7-56b5-42b4-b86c-15c62bcf87d3",
      "0a8a735f-18ae-4290-b67a-0a70fcd2313c",
      "112e4159-915f-42d2-b32f-309d7e0c153b",
      "21c2cf62-1a52-4c77-ac08-a1d67c1ead95",
      "2ff6d6d2-67c1-49fc-ae59-6f8202623483",
      "3cfd1cb2-9db3-4975-824b-166f623a4cc6",
      "40691394-7888-455d-993f-4da3e2779c31",
      "4165d7bc-8a51-4306-bafc-ceaf9e2fc2e6",
      "4557f45d-a7b7-4de9-add5-dfba8cdceee3",
      "4b740e67-e0b3-4ff4-90b9-00f893c38559",
      "6b3ee1be-b2cc-4254-9b67-542ab90f0562",
      "6d8d5681-b4b3-41fa-9d40-622f1f323dc5",
      "9e0ae3b1-551b-463e-8724-d3a3eadd858c",
      "b7d085c0-0a03-472a-a755-e6b887393d3f",
      "be3c35c7-6ea4-4172-a676-e46b2cad5788",
      "c44e7b5d-c067-48ca-a5c6-a65591333b50",
      "d31ab976-98c8-4484-b82f-26320c07231a",
      "d4cd35ae-4e94-4fbc-af91-f8253cd0f794",
      "dd6a0bf4-7e65-4c7c-b82f-334f990e0b66",
      "e1547a89-d907-4e53-9fed-9264f5f720a3",
      "e79bcd0f-fc38-437d-971a-e4d7dac5601e",
      "e7f4e9be-eeed-442e-b684-3f97d5203f21",
      "f083fd69-b15e-417e-b092-94d30226a290",
      "f12dda55-2041-489c-ba5e-775bd815b9c2"
    ],
    "name": "Midu",
    "userData": "8"
  },
  {
    "personId": "ff4636da-6b2b-4914-b0eb-83378baf2d75",
    "persistedFaceIds": [
      "0cd6f8ca-837a-4ec4-8138-3c2719026956",
      "1437f8ec-04ee-41e5-845b-2b0379b446cc",
      "168c21fc-05cf-4b5b-9378-91c094f8d3cc",
      "1db7436f-57e0-41c0-a588-fa6f4ba4e4dd",
      "2368a258-a425-4715-a90e-df1c042498df",
      "357fa2e8-6f77-458c-9244-a29f3136edd2",
      "4d52b4e8-490f-4fe7-a47b-7f151a16576a",
      "5956d8c9-b35a-4d54-9dd3-ae6c030157fd",
      "595b6ada-66da-4516-b135-b69468cb9c3a",
      "6b2c11f6-e4e9-486b-bca9-810feccbf2b2",
      "86007035-8c39-4e77-be69-4cecf8870bf2",
      "b1ade03f-5987-4aba-828d-f77b1aa5176e",
      "b61d0c95-2446-4965-ba6d-8618fe978b03",
      "be927cd1-4f79-4673-92e4-9f081642f0ae",
      "c666b933-f5fe-4672-9f56-b6f60cc1da95",
      "c9f4d21d-fcde-4b9e-bc22-773103c16661",
      "cccf0360-5592-4732-a225-f790f93c62e0",
      "ea161ac3-41cc-4d31-8b60-aeca100b7561",
      "f3cd9d61-d4ea-470b-ac3b-87f9161b4c11",
      "f662ce4a-e8a0-48af-bcc4-4aefb5fb05fe"
    ],
    "name": "Hường Hana",
    "userData": "3"
  },
  {
    "personId": "ffb8daa7-fb43-4a1e-b895-43dcd0191b2d",
    "persistedFaceIds": [
      "02068783-a8ed-4f00-a5d3-5709d5d33d0a",
      "0d0f8fb0-37ad-4dcf-885c-c9785d8e653c",
      "1167c90d-9886-400c-a3fe-61e4342d683d",
      "2bb8ae28-f1ad-4863-8c97-d1fe14bedc14",
      "4b7dfd32-90a3-4864-9848-339813073963",
      "542732a8-7578-46d3-90eb-c6b0f554479c",
      "57e77569-d97a-46ff-b896-d058c3268998",
      "6d864afb-8c35-41d4-ab9b-a18c0c534706",
      "743379ba-c0a2-4613-b861-71f9aaff2fae",
      "7ca8eb14-803c-432f-bfcb-b2cfffa4d920",
      "92a9d423-5f47-4ad2-ac6a-894a857d76ed",
      "954da95c-5836-43fc-ab62-cb841e245add",
      "a712a110-6747-4e11-b74f-1ed80efb07cf",
      "aaa310e6-79e1-45d4-ba6a-454da97aa32b",
      "bc6b6933-ee06-4c85-82a8-17321054cd13",
      "c0d5b9d7-639d-4982-81c3-983555b6bce4",
      "c9d122bc-1b07-40ae-9bd3-50346b0aba02",
      "ca0c6f04-be95-41e2-aa0e-a8a182b4a965",
      "ddb0b276-f752-48ea-9e43-4da89e16fae8",
      "e6f22029-f930-4f7d-9c0e-d780951788b5"
    ],
    "name": "Hường Hana",
    "userData": "3"
  }
];
