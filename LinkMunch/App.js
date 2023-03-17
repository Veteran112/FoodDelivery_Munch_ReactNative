/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */
import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StyleSheet, View, Text, Button, Alert } from 'react-native';
import Customer from './modules/customer/Customer';
import { Colors } from 'react-native/Libraries/NewAppScreen';
import Amplify from 'aws-amplify';
import { Auth } from 'aws-amplify';
import {
  withAuthenticator,
  ConfirmSignIn,
  Greetings,
  Loading,
  RequireNewPassword,
} from 'aws-amplify-react-native';
import awsconfig from './aws-exports';
import { ActivityIndicator, LogBox } from 'react-native';
import {
  Signin,
  Signup,
  ConfirmSignup,
  ForgotPassword,
  VerifyContact,
} from './modules/authentication';
import WrongPlace from './modules/customer/WrongPlace';

Amplify.configure({
  ...awsconfig,
  Analytics: {
    disabled: true,
  },
});

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: '',
      isRestaurant: '',
      signedIn: false,
      name: '',
      protoUrl: '',
      loading: true,
      orders: { Orders: [] },
      restaurants: [],
      restaurantConfigs: [],
      promos: '',
    };
  }
  async componentDidMount() {
    try {
      Auth.currentUserInfo().then(info => {
        console.log('info', info);
        //userId = info.username;
        //If you make an account with cognito you can use this, and just populate the dynamo db
        //this.getUser(userId);
        //If you just want to mess with restaurant ui
        this.getUser(info);
        //If you just want to mess with customer ui
        //this.getUser('cc3fc7b4-e715-4700-a811-31a23034d32c');
      });
    } catch (e) {
      Alert.alert('Unable to load user data');
    }
  }

  async getUser(info) {
    let dataCall = await getUserTable(info);
    let dataJson = await dataCall;
    let retrievedData = JSON.parse(dataJson);
    let rest = retrievedData.restaurant;
    this.setState({
      data: retrievedData.userData,
      orders: retrievedData.orders,
      isRestaurant: false,
      loading: false,
      restaurants: retrievedData.menuCategories ?? [],
      restaurantConfigs: retrievedData.restaurantConfigs ?? [],
      promos: retrievedData.promos,
      poc_name: 'poc name',
      business_name: 'business name',
      street_business: 'street business',
      city_business: 'city business',
      state_business: 'state business',
      zip: 'zip',
      website: 'website',
      credit: retrievedData.credit ?? 0
    });
    async function getUserTable(info) {
      const body = JSON.stringify({
        incoming_Id: info.username,
        is_customer: true,
        email: info.attributes.email,
        phoneNumber: info.attributes.phone_number,
        poc_name: 'poc name',
        business_name: 'business name',
        street_business: 'street business',
        city_business: 'city business',
        state_business: 'state business',
        zip: 'zip',
        website: 'website'
      });
      let token = null;
      let prom = Auth.currentSession().then(
        info => (token = info.getIdToken().getJwtToken()),
      );
      await prom;
      const response = await fetch(
        'https://9yl3ar8isd.execute-api.us-west-1.amazonaws.com/beta/getuserid',
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
          body: body, // body data type must match “Content-Type” header
        },
      );
      let data = await response.json(); // parses JSON response into native JavaScript objects
      console.log('data', data);
      return data;
    }
  }

  render() {
    if (!this.state.loading) {
      return (
        <NavigationContainer>
          {this.state.isRestaurant ? (
            <WrongPlace 
              name={this.state.name}
              data={this.state.data}
              initialParams={{ data: this.state.data }}
            />
          ) : (
            <Customer
              name={this.state.name}
              data={this.state.data}
              restaurants={this.state.restaurants}
              promos={this.state.promos}
              restaurantConfigs={this.state.restaurantConfigs}
              credit={this.state.credit}
            />)}
        </NavigationContainer>
      );
    } else {
      return (
        <View style={[styles.container, styles.horizontal]}>
          <ActivityIndicator size="large" color="#F86D64" />
        </View>
      );
    }
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  horizontal: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
  },
  scrollView: {
    backgroundColor: Colors.lighter,
  },
  appView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  engine: {
    position: 'absolute',
    right: 0,
  },
  body: {
    backgroundColor: Colors.white,
  },
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.black,
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
    color: Colors.dark,
  },
  highlight: {
    fontWeight: '700',
  },
  header: {
    fontSize: 25,
    padding: 100,
    textAlign: 'center',
  },
  footer: {
    color: Colors.dark,
    fontSize: 12,
    fontWeight: '600',
    padding: 4,
    paddingRight: 12,
    textAlign: 'right',
  },
  loadingScreen: {
    marginTop: 250,
    marginLeft: 75,
  },
});

export default withAuthenticator(App, false, [
  <Loading />,
  <Signin />,
  <ConfirmSignIn />,
  <VerifyContact />,
  <Signup />,
  <ConfirmSignup />,
  <ForgotPassword />,
  <RequireNewPassword />,
  <Greetings />,
]);
