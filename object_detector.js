//https://dev.to/andreygermanov/how-to-detect-objects-in-videos-in-a-web-browser-using-yolov8-neural-network-and-javascript-lfb/comments


const WIDTH = 640
const HEIGHT = 640
const MODEL_PATH = "models/smal.onnx"


const fileInput = document.getElementById('imgInput');
const img = document.getElementById('imgDisplay');

async function btnClick() {
    if (credentials == null) {
        console.log("was null")
        credentials = await getCredentials()
    }
    // console.log(credentials)
    const res = await postRequest("https://kystdatahuset.no/ws/api/ship/free-text", { "FreeText": "nord" }, credentials)
    console.log(res)
}

const textInput = document.getElementById('textInput');
const responseSelect = document.getElementById('responseSelect');
const body = document.querySelector("body")
const feedback = document.getElementById("feedback")


function resetStyling() {
    body.style.backgroundColor = "white"
    feedback.innerHTML = ""
}
async function handleImageSelect() {

    resetStyling()
    // Check if an image is selected
    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();

        // Define what happens when the image is loaded
        reader.onload = function (e) {
            img.src = e.target.result;
            img.style.display = 'none'; //No need to show the image element 
        };

        // Read the selected file as a data URL
        reader.readAsDataURL(fileInput.files[0]);

        img.onload = async function () {

            const canvas = document.querySelector('canvas');
            canvas.width = WIDTH
            canvas.height = HEIGHT
            const input = prepare_input(canvas, img)
            const output = await run_model(input)

            // Call the function to perform object detection on the selected image

            const boxes = process_output(output, WIDTH, HEIGHT)
            
            if (boxes.length > 0) {
                body.style.backgroundColor = "lightgreen"
                feedback.innerHTML = "JAAAAA"
            } else {
                body.style.backgroundColor = "red"
                feedback.innerHTML = "Nei..."

            }
            // Draw bounding boxes on the image
            draw_boxes(canvas, boxes);
            
        };


    }
}

// Attach the handleImageSelect function to the change event of the input element
document.getElementById('imgInput').addEventListener('change', handleImageSelect);


function prepare_input(canvas, img) { //take image and converts it to list of RGB

    const context = canvas.getContext("2d");
    context.drawImage(img,0,0,WIDTH*0.66,HEIGHT*0.66);

    const data = context.getImageData(0, 0, WIDTH, HEIGHT).data;
    const red = [], green = [], blue = [];
    for (let index = 0; index < data.length; index += 4) {
        red.push(data[index] / 255);
        green.push(data[index + 1] / 255);
        blue.push(data[index + 2] / 255);
    }
    return [...red, ...green, ...blue];
}


async function run_model(input) { //Runs model with the RGB list as input, returns a long mess of a list with predictions
    const model = await ort.InferenceSession.create(MODEL_PATH);
    input = new ort.Tensor(Float32Array.from(input), [1, 3, WIDTH, HEIGHT]);
    const outputs = await model.run({ images: input });
    return outputs["output0"].data;
}

function process_output(output, img_width, img_height,cut_off=0.5) { //Converts the output to box format
    let boxes = [];
    for (let index = 0; index < 8400; index++) {
        const [class_id, prob] = [...Array(1).keys()]
            .map(col => [col, output[8400 * (col + 4) + index]])
            .reduce((accum, item) => item[1] > accum[1] ? item : accum, [0, 0]);
        if (prob < cut_off) { //Cut-off
            continue;
        }
        const label = gravemaskin_classes[class_id];
        const xc = output[index];
        const yc = output[8400 + index];
        const w = output[2 * 8400 + index];
        const h = output[3 * 8400 + index];

        const x1 = (xc - w / 2) / WIDTH * img_width;
        const y1 = (yc - h / 2) / HEIGHT * img_height;
        const x2 = (xc + w / 2) / WIDTH * img_width;
        const y2 = (yc + h / 2) / HEIGHT * img_height;
        boxes.push([x1, y1, x2, y2, label, prob]);
    }

    boxes = boxes.sort((box1, box2) => box2[5] - box1[5])
    const result = [];
    while (boxes.length > 0) {
        result.push(boxes[0]);
        boxes = boxes.filter(box => iou(boxes[0], box) < 0.3); //remove the box, if the overlap is big enough
    }
    return result;
}

//In some Yolo version the input may come in this format, left the code in case of future people running into it
/*function process_output2(output, img_width, img_height) {
    let boxes = [];
    const numberOfClasses = 80
    const cycleNumber = numberOfClasses + 5 //number of elements in list before new box
    maxNumberOfBoxes = output.length / cycleNumber
    for (let index = 0; index < maxNumberOfBoxes; index++) {
        let class_id = 0;
        let prob = 0;
        [...Array(numberOfClasses).keys()].forEach(col => {
            const currentProb = output[(col + 5) + index * cycleNumber];

            if (currentProb > prob) {
                prob = currentProb;

                class_id = col;

            }
        });
        if (prob < 0.8) {

            continue;
        }
        const label = yolo_classes[class_id];
        const xc = output[index * cycleNumber];
        const yc = output[index * cycleNumber + 1];
        const w = output[index * cycleNumber + 2];
        const h = output[index * cycleNumber + 3];

        const x1 = (xc - w / 2) / 640 * img_width;
        const y1 = (yc - h / 2) / 640 * img_height;
        const x2 = (xc + w / 2) / 640 * img_width;
        const y2 = (yc + h / 2) / 640 * img_height;
        boxes.push([x1, y1, x2, y2, label, prob]);
    }


    boxes = boxes.sort((box1, box2) => box2[5] - box1[5])
    const result = [];
    while (boxes.length > 0) {
        result.push(boxes[0]);
        boxes = boxes.filter(box => iou(boxes[0], box) < 0.005);
    }
    return result;
}
*/

function iou(box1, box2) {
    return intersection(box1, box2) / union(box1, box2);
}

function union(box1, box2) {
    const [box1_x1, box1_y1, box1_x2, box1_y2] = box1;
    const [box2_x1, box2_y1, box2_x2, box2_y2] = box2;
    const box1_area = (box1_x2 - box1_x1) * (box1_y2 - box1_y1)
    const box2_area = (box2_x2 - box2_x1) * (box2_y2 - box2_y1)
    return box1_area + box2_area - intersection(box1, box2)
}

function intersection(box1, box2) {
    const [box1_x1, box1_y1, box1_x2, box1_y2] = box1;
    const [box2_x1, box2_y1, box2_x2, box2_y2] = box2;
    const x1 = Math.max(box1_x1, box2_x1);
    const y1 = Math.max(box1_y1, box2_y1);
    const x2 = Math.min(box1_x2, box2_x2);
    const y2 = Math.min(box1_y2, box2_y2);
    return (x2 - x1) * (y2 - y1)
}


const gravemaskin_classes = [
    "Gravemaskin"
]


function draw_image_and_boxes(file, boxes) {
    const img = new Image()
    img.src = URL.createObjectURL(file);
    img.onload = () => {
        const canvas = document.querySelector("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        ctx.strokeStyle = "#00FF00";
        ctx.lineWidth = 3;
        ctx.font = "18px serif";
        boxes.forEach(([x1, y1, x2, y2, label]) => {
            ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
            ctx.fillStyle = "#00ff00";
            const width = ctx.measureText(label).width;
            ctx.fillRect(x1, y1, width + 10, 25);
            ctx.fillStyle = "#000000";
            ctx.fillText(label, x1, y1 + 18);
        });
    }
}

function draw_boxes(canvas, boxes) {
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#00FF00";
    ctx.lineWidth = 3;
    ctx.font = "18px serif";
    boxes.forEach(([x1, y1, x2, y2, label]) => {
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        ctx.fillStyle = "#00ff00";
        const width = ctx.measureText(label).width;
        ctx.fillRect(x1, y1, width + 10, 25);
        ctx.fillStyle = "#000000";
        ctx.fillText(label, x1, y1 + 18);
    });
}