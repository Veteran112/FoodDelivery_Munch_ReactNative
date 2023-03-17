//TODO: get this external module connected async with google and facebook login sdk
import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  Linking
} from 'react-native';
import { RFValue } from 'react-native-responsive-fontsize';
import { Input, Button } from 'react-native-elements';
import { Auth } from 'aws-amplify';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'

import Images from "../theme/Images";

const sWidth = Dimensions.get('window').width;
const sHeight = Dimensions.get('window').height;

export default class signIn extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      username: '',
      password: '',
      error: '',
    };
  }

  signin = () => {
    try {
      let self = this;
      Auth.signIn({ username: this.state.username.toLowerCase(), password: this.state.password })
        .then(() => {
          self.props.onStateChange('signedIn');
        })
        .catch(err => this.setState({ error: err.message }));
    } catch (e) {
      this.setState({ error: e.message });
    }
  };

  render() {
    if (
      this.props.authState == 'signIn' ||
      this.props.authState == 'signedUp'
    ) {
      return (
        <View style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1, height: '100%' }}>
            <View style={styles.contentView}>
              <KeyboardAwareScrollView showsVerticalScrollIndicator={false}>
                <View>
                  <View style={styles.logoContainer}>
                    <Image
                      source={Images.logo_merchant_red}
                      style={styles.logo}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={styles.subContainer}>
                    <Input
                      autoCapitalize="none"
                      placeholder="Username"
                      placeholderTextColor="black"
                      TextColor="black"
                      inputStyle={{ color: 'black' }}
                      containerStyle={{ paddingHorizontal: 0 }}
                      inputContainerStyle={{
                        borderBottomColor: 'black',
                        borderBottomWidth: 1,
                        marginLeft: 0,
                      }}
                      onChangeText={value => this.setState({ username: value.toLowerCase(), error: '' })}
                    />
                    <Input
                      autoCapitalize="none"
                      placeholder="Password"
                      placeholderTextColor="black"
                      inputStyle={{ color: 'black' }}
                      containerStyle={{ paddingHorizontal: 0 }}
                      inputContainerStyle={{
                        borderBottomColor: 'black',
                        borderBottomWidth: 1,
                      }}
                      secureTextEntry={true}
                      onChangeText={value => this.setState({ password: value, error: '' })}
                    />
                    <Button
                      title="SIGN IN"
                      buttonStyle={{
                        backgroundColor: '#D65344',
                        paddingTop: 15,
                        paddingBottom: 15,
                        marginTop: 30,
                      }}
                      onPress={this.signin}
                    />
                    {this.state.error != '' && (
                      <Text style={styles.error}>{this.state.error}</Text>
                    )}
                    <Button
                      title="Become a restaurant partner"
                      buttonStyle={{
                        backgroundColor: 'clear',
                        paddingTop: 15,
                        paddingBottom: 15,
                        marginTop: 25, //30, same as SingUp page
                      }}
                      titleStyle={styles.signupBtn}
                      // onPress={() => this.props.onStateChange('signUp')}
                      onPress={() => Linking.openURL("https://linkmunch.com/merchant/")}
                    />
                  </View>
                </View>
              </KeyboardAwareScrollView>
              <TouchableOpacity
                style={styles.forgotBtn}
                onPress={() => this.props.onStateChange('forgotPassword')}>
                <Text style={styles.forgot}>Forgot Password</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      );
    } else {
      return null;
    }
  }
}

const styles = StyleSheet.create({
  loginBg: {
    position: 'absolute',
    left: -10,
    top: -50,
    width: sWidth + 20,
    height: sHeight + 30,
    resizeMode: 'cover',
  },
  logoContainer: {
    flex: 1,
    width: sWidth - 50,
  },
  logo: {
    width: sWidth - 100,
    height: 150,
    alignSelf: 'center'
  },
  container: {
    flex: 1,
  },
  contentView: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: (sHeight - 600) / 2,
  },
  subContainer: {
    marginTop: 50,
    width: '100%',
  },
  signintext: {
    color: 'black',
    fontSize: RFValue(17, 580),
    marginTop: 5,
  },
  signupBtn: {
    // fontWeight: '500',
    // textDecorationLine: 'underline',
    color: "black"
  },
  forgotBtn: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
  },
  forgot: {
    color: 'black',
    fontSize: RFValue(15, 580),
    textAlign: 'center',
  },
  error: {
    color: '#FB322F',
    textAlign: 'center',
    marginTop: 10,
  },
});