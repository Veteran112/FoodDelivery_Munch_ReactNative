import { Auth } from 'aws-amplify';

export function updateDynamoRestaurant(id, incomingData, triggerOfficialSignOut = false, newPassword = "", email = "") {
  updateRestaurantProfile(id, incomingData);
  
  async function updateRestaurantProfile(id, dataToDynamo) {
    const info = await Auth.currentUserInfo();
    const body = { ...dataToDynamo, RestaurantId: id, restaurant: true, triggerOfficialSignOut: triggerOfficialSignOut, newPassword: newPassword, email: email };

    console.log(body)

    let token = null;
    let prom = Auth.currentSession().then(
      info => (token = info.getIdToken().getJwtToken()),
    );
    await prom;
    const response = await fetch(
      'https://9yl3ar8isd.execute-api.us-west-1.amazonaws.com/beta/restaurants/updateProfile',
      {
        method: 'POST', // *GET, POST, PUT, DELETE, etc.
        mode: 'cors', // no-cors, *cors, same-origin
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        credentials: 'same-origin', // include, *same-origin, omit
        headers: {
          'Content-Type': 'application/json',
          'Connection': 'keep-alive',
          'Authorization': token,
        },
        redirect: 'follow', // manual, *follow, error
        referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
        body: JSON.stringify(body), // body data type must match “Content-Type” header
      },
    );
    let apiResponse = await response.json(); // parses JSON response into native JavaScript objects
    if (triggerOfficialSignOut) {
      Auth.signOut()
    }
    console.log('responsedata', apiResponse);
  }
}
