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
import { Colors } from 'react-native/Libraries/NewAppScreen';
import Restaurant from './modules/restaurant/Restaurant';
import { Amplify } from 'aws-amplify';
import { Auth } from 'aws-amplify';
import {
  withAuthenticator,
  ConfirmSignIn,
  Greetings,
  Loading
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
import WrongPlace from './modules/restaurant/WrongPlace'
import RequireNewPassword from './modules/authentication/RequireNewPassword'
import { findBreakingChanges } from 'graphql';
import { StripeProvider } from '@stripe/stripe-react-native';

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
      id: '',
      data: '',
      isRestaurant: '',
      signedIn: false,
      name: '',
      loading: true,
      orders: { Orders: [] },
      promos: '',
    };
  }
  async componentDidMount() {
    try {
      Auth.currentUserInfo().then(info => {
        console.log('info', info);
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
    let retrievedData = await dataCall;
    let rest = retrievedData.restaurant;
    this.setState(
      {
        id: retrievedData.userData.RestaurantId,
        data: retrievedData.userData.Profile,
        menu: retrievedData.restaurantMenu,
        menuCategories: retrievedData.restaurantMenuConfig ? retrievedData.restaurantMenuConfig.menu_config.categories : [],
        orders: retrievedData.orders,
        isRestaurant: rest,
        activeSubscription: retrievedData.userData?.Profile?.restaurantInfo?.activeSubscription ?? false,
        acceptedTerms: retrievedData.userData?.Profile?.restaurantInfo?.acceptedTerms ?? false,
        loading: false,
        promos: retrievedData.promos,
        poc_name: 'poc name',
        businessName: 'business name',
        addressLine: 'street business',
        addressCity: 'city business',
        addressState: 'state business',
        addressZip: 'zip',
        website: 'website'
      }
    );

    async function getUserTable(info) {
      const body = JSON.stringify({
        incoming_Id: info.attributes.sub,
        is_customer: false,
        email: info.attributes.email,
        phoneNumber: info.attributes.phone_number,
        poc_name: 'poc name',
        businessName: 'business name',
        addressLine: 'street business',
        addressCity: 'city business',
        addressState: 'state business',
        addressZip: 'zip',
        website: 'website'
      });
      console.log('body', body);
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
      let data = JSON.parse(await response.json()); // parses JSON response into native JavaScript objects
      console.log('data', data);
      return data;
    }
  }

  render() {
    // Auth.signOut()
    if (!this.state.loading) {
      return (
        <StripeProvider
          publishableKey="pk_test_51JGZUXCQQLgS1lWmCBVEf4pjszDxVHe21vosctxUAgJZw2RZjH9R0FXTRBzrlDRWLDYDnxyDlDY9elMZbADNXcim00yf790JCh"
          merchantIdentifier="merchant.com.LinkMunchMerchant" // required for Apple Pay
        >
          <NavigationContainer>
            {this.state.isRestaurant ?
              !this.state.data.restaurantInfo.admin && (this.state.data.restaurantInfo.resetPW || !this.state.activeSubscription || !this.state.acceptedTerms) ? (
                <RequireNewPassword
                  id={this.state.id}
                  name={this.state.name}
                  menu={this.state.menu}
                  menuCategories={this.state.menuCategories}
                  data={this.state.data}
                  orders={this.state.orders}
                  promos={this.state.promos}
                  resetPW={this.state.data.restaurantInfo.resetPW}
                  activeSubscription={this.state.activeSubscription}
                  acceptedTerms={this.state.acceptedTerms}
                  acceptedPrivacy={this.state.acceptedPrivacy}
                />
              ) :
                (<Restaurant
                  id={this.state.id}
                  name={this.state.name}
                  menu={this.state.menu}
                  menuCategories={this.state.menuCategories}
                  data={this.state.data}
                  orders={this.state.orders}
                  promos={this.state.promos}
                />
                ) : (
                <WrongPlace
                  name={this.state.name}
                  data={this.state.data}
                  initialParams={{ data: this.state.data }}
                />
              )}
          </NavigationContainer>
        </StripeProvider>
      );
    } else {
      return (
        <View style={[styles.container, styles.horizontal]}>
          <ActivityIndicator size="large" color="#D65344" />
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
  <Greetings />,
]);
