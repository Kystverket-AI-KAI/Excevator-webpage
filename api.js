let credentials;

async function getJwtToken(username, password) {
    const url = "https://kystdatahuset.no/ws/api/auth/login";
    const headers = {
      "accept": "*/*",
      "Content-Type": "application/json"
    };
    const data = {
      "username": username,
      "password": password
    };
  
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(data)
      });
  
      if (!response.ok) {
        // Handle the error if the response is not successful (e.g., 404 or 500)
        throw new Error("Network response was not ok");
      }
  
      const responseData = await response.json();
      return responseData.data.JWT;
    } catch (error) {
      // Handle any network errors or exceptions
      console.error("Error fetching JWT token:", error);
      return null;
    }
  }
  

async function getCredentials() {
    //const token = await getJwtToken("kemosabe.bot@gmail.com","qwerty123")
    const token = await getJwtToken("email","password")
    credentials = token
}



async function postRequest(apiEndpoint, data,jwtToken) {
  
  const headers = {
    "accept": "text/plain",
    "Authorization": jwtToken ? `Bearer ${jwtToken}` : "",
    "Content-Type": "application/json"
  };


  try {
    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      // Handle the error if the response is not successful (e.g., 404 or 500)
      throw new Error("Network response was not ok");
    }

    // If the response is successful and has data, parse and return it
    const responseData = await response.json();
    return responseData;
  } catch (error) {
    // Handle any network errors or exceptions
    console.error("Error making POST request:", error);
    return null;
  }
}

