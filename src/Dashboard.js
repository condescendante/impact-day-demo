import {
    Container,
    Box,
    Image,
    Center,
    Divider,
    VStack,
    GridItem,
    Grid,
    Heading,
    Card,
    CardBody,
    Stack,
    Checkbox,
    Select,
    Spinner,
    useToast,
    Text,
} from '@chakra-ui/react';

import {
    React, 
    useState, 
    useEffect
} from 'react'

import axios from 'axios';
import ncsrhlogo from '../ncs_rh_logo.jpg';

let baseurl = 'http://localhost:8080'

const evtSource = new EventSource(baseurl + "/api/sse");

// Process Photo SSE
function Photo() {
  const [photo, setPhoto] = useState('');
  const [checked, setChecked] = useState(true);
  const [refresh, setRefresh] = useState(null);
  const [annotatedImage, setAnnotatedImage] = useState(null);
  const [rawImage, setRawImage] = useState(null);

  useEffect(() => {
    evtSource.addEventListener("annotated_image", updatePhoto);
    evtSource.addEventListener("raw_image", updatePhoto);
  })

  const updatePhoto = (event) => {
    if (event == null || event.data == null || event.type == null) return;
    if (event.type === "annotated_image")
        setAnnotatedImage(event.data);
    else
        setRawImage(event.data);
    setRefresh(true);
  }

  function clearPhoto() {
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    context.fillStyle = "#AAA";
    context.fillRect(0, 0, canvas.width, canvas.height);
  
    var data = canvas.toDataURL('image/png');
    setPhoto('data:image/jpeg;charset=utf-8;base64,' + data);
  }

  useEffect(() => {
      let data = (checked?annotatedImage:rawImage);
      if (data == null) {
        clearPhoto();
        return;
      }else{
          setPhoto('data:image/jpeg;charset=utf-8;base64,' + data);
      }
      setRefresh(false);
    }, [refresh, checked]);

  return (
  <Container>
    <Checkbox 
      colorScheme='blue' 
      defaultChecked
      onChange={(e) => setChecked(e.target.checked)}>Annotated
    </Checkbox>
    <Image 
      objectFit='cover' 
      borderRadius='10px' 
      src={photo} 
      alt="threatpic"/>
  </Container>
  )
}

// Process Timestamp SSE
function Timestamp() {
  const [time, setTime] = useState('');

  useEffect(() => {
    evtSource.addEventListener("timestamp", updateTimestamp);
  })

  const updateTimestamp = (event) => {
    if (event == null || event.data == null) return;
  
    let date = new Date(event.data * 1000);
    setTime(date.toString().split(' ')[4]);
  }

  return <Heading color='blue.600' size='md'>Timestamp: {time}</Heading>
}

// Process LLM Response SSE
function Response() {
  var llmResponse = '';
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [response, setResponse] = useState('');

  useEffect(() => {
    evtSource.addEventListener("llm_request_start", showLLMResponseSpinner);
    evtSource.addEventListener("llm_response", updateResponse);
    evtSource.addEventListener("llm_response_start", hideLLMResponseSpinner);
    evtSource.addEventListener("prompt", setPrompt);
  })

  function showLLMResponseSpinner(event) {
    setIsDataLoading(true);
  }
  
  function hideLLMResponseSpinner(event) {
    setIsDataLoading(false);
  }

  const updateResponse = (event) => {
    if (event == null || event.data == null) return;
    const obj = JSON.parse(event.data);
    //console.log(event.data);
    if (obj == null || obj.response == null) return;
    llmResponse += obj.response
  }

  const setPrompt = (event) => {
    if (event != null) {
      setResponse(llmResponse);
    }
  }

  return (
    <Container>
      {isDataLoading ? 
        <Spinner
          thickness='4px'
          speed='0.65s'
          emptyColor='gray.200'
          color='blue.500'
          size='xl'
        /> :
        <Box>
          {response}
        </Box>
      }
    </Container>
  )
}

// Process GET prompt list from server
function Promptlist () {
  const [promptlist, setPromptlist] = useState('');

  useEffect(() => {
    fetch(baseurl + '/api/prompt')
      .then(response => response.json())
      .then(json => setPromptlist(json))
      .catch(error => console.error(error));
  }, [baseurl]);

  let dropdownArr = [];
  for (let i=0; i<promptlist.length; i++) {
    dropdownArr.push(<option value={promptlist[i]}>{promptlist[i]}</option>)
  }

 return dropdownArr
}

// Prompt dropdown menu and POST prompt to server
function Dropdown () {
  const toast = useToast();

  const handleChangePrompt = async (event) => {
    try {
      const config = {
        headers: {
          'Content-type': 'application/json',
        },
      };
      let data = await axios.post(
        (baseurl + '/api/prompt'),
        {
          body: JSON.stringify({
            prompt: event.target.value,
          }),
        },
        config
      );
      console.log("🚀 ~ handleChangePrompt ~ data:", data)
      //console.log(JSON.stringify({prompt: event.target.value,}));
      
      toast({
        title: 'Prompt Changed to ' + event.target.value,
        status: 'success',
        duration: 5000,
        isClosable: true,
        position: 'bottom',
      });
    } catch (error) {
      toast({
        title: 'Error Occurred!',
        description: error.response.data.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'bottom',
      });
    }
  };
  
  return  <Select 
            size='lg' 
            bg='white' 
            variant='outline' 
            placeholder='Select prompt'        
            onChange={handleChangePrompt}
          >
            <Promptlist/>
          </Select>
}

// Main dashboard display
function Dashboard () {
  return (
    <Container maxW="8xl" centerContent>
    
        <Center p={3} w="100%" m="40px 0 15px 0">
            <Image objectFit='cover' src={ncsrhlogo} />  
        </Center>

        <Divider orientation="horizontal" />

        <Box m="20px"></Box>
        
        <Heading size='lg'>Threat Detection Dashboard</Heading>

        <Center>
            <Grid
              templateColumns="repeat(2, 1fr)"
              templateRows="repeat(1, 1fr)"
              gap={6}
              p={3}
              w="300%"
              bgColor="#eff7fa"
              m="40px 0 15px 0"
              borderRadius="lg"
              borderWidth="1px"
            >
                <GridItem colSpan={1} rowSpan={1}>
                    <Center>
                    <Card w='100%'>
                        <CardBody>
                            <Stack mb='6' spacing='3'>   
                              <Timestamp/>
                              <Photo/>
                            </Stack>
                        </CardBody>
                    </Card>
                    </Center>
                </GridItem>

                <GridItem colSpan={1} rowSpan={1}>
                <VStack spacing={4}>
                    <Dropdown/>
                    <Divider orientation="horizontal" />   
                    <Card>
                    <CardBody>
                        <Response/>
                    </CardBody>
                    </Card>
                </VStack>
                </GridItem>   
            </Grid>
          </Center>
        </Container>
  )
}

export default Dashboard