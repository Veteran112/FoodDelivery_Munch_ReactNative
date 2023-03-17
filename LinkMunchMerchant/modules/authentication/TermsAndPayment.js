import React, { useState, useEffect, useCallback } from 'react'
import { Text, Input, Button, CheckBox } from 'react-native-elements'
import { View, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Alert, Linking, Image, ActivityIndicator } from 'react-native'
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen'
import { RFValue } from 'react-native-responsive-fontsize'
import { Auth } from 'aws-amplify';
import Restaurant from '../restaurant/Restaurant';
import { updateDynamoRestaurant } from '../restaurant/components/subcomponents/ProfileEditor/updateDynamoRest';
import Images from '../theme/Images'
import { useStripe } from '@stripe/stripe-react-native';
import RNRestart from 'react-native-restart';
let finished = false
let id = ""

export default class TermsAndPayment extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            id: props.id,
            name: props.name,
            protoUrl: '',
            data: props.data,
            orders: props.orders,
            menu: props.menu,
            menuCategories: props.menuCategories,
            promos: props.promos,
            password: "",
            confirmPassword: "",
            error: "",
            tempPassword: "",
            activeSubscription: props.activeSubscription,
            skipSubscription: false,
            message: props.message ?? "",
            loading: false,
            checkedTermsAndPrivacy: false,
            payment: false
        };
        id = this.state.id
        data = this.state.data;
        orders = this.state.orders;
        menu = this.state.menu;
        promos = this.state.promos;
        menuCategories = this.state.menuCategories
    }

    render() {
        return (
            <TermsAndConditions
                data={this.state.data}
            />
        )
    }
}

function TermsAndConditions(data) {
    const [error, setError] = useState(false)
    const [message, setMessage] = useState("")
    const [checkedTermsAndPrivacy, setCheckedTermsAndPrivacy] = useState(false)
    const { initPaymentSheet, presentPaymentSheet } = useStripe();
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState(data.data)

    const fetchPaymentSheetParams = async () => {

        const body = JSON.stringify({
            email: profile.restaurantInfo.restaurantEmail,
            name: profile.restaurantInfo.restaurantName,
            phone: profile.restaurantInfo.restaurantPhoneNumber
        });

        const response = await fetch(`https://9yl3ar8isd.execute-api.us-west-1.amazonaws.com/beta/payment-sheet`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: body,
        });
        const { setupIntent, ephemeralKey, customer, publishableKey } = JSON.parse(await response.json())


        return {
            setupIntent,
            ephemeralKey,
            customer,
        };
    };

    const initializePaymentSheet = async () => {
        const {
            setupIntent,
            ephemeralKey,
            customer,
        } = await fetchPaymentSheetParams();

        const { error } = await initPaymentSheet({
            merchantDisplayName: "LinkMunch Merchant",
            customerId: customer,
            customerEphemeralKeySecret: ephemeralKey,
            setupIntentClientSecret: setupIntent,
            allowsDelayedPaymentMethods: true,
            // returnURL: 'linkmunchmerchant://'
        });
        if (!error) {
            setLoading(true);
        }
    };

    const openPaymentSheet = async () => {
        const { error } = await presentPaymentSheet();

        if (error) {
            Alert.alert(`Error code: ${error.code}`, error.message);
        } else {
            let profiledata = profile
            let newProfileData = {
                ...profiledata,
                restaurantInfo: {
                    ...profiledata.restaurantInfo,
                    acceptedTerms: true,
                    activeSubscription: true,
                    resetPW: false
                }
            }

            updateDynamoRestaurant(id, newProfileData, true)
            Alert.alert('Payment Saved!', 'Your Link Munch Merchant account is ready! Sign in with your new password to get started.');
        }
    };

    useEffect(() => {
        initializePaymentSheet();
    }, []);

    return (
        <View style={style.container}>
            {/* <Text h4 h4Style={{ fontSize: RFValue(18, 580) }}>Signup for LinkMunch Merchant!</Text> */}

            <View
                key={error}
            >
                {message != "" && (
                    <Text style={{ textAlign: "center", color: "red" }}>
                        {message}
                    </Text>
                )}
            </View>
            <Image
                source={Images.logo_merchant_red}
                style={style.logo}
            />
            <SafeAreaView style={style.safeViewContainer}>
                <View style={style.scrollView}>
                    <Text style={style.scrollViewText}>
                        Welcome to Link Munch Merchant, an online platform where your restaurant can connect, engage, and grow with customers.
                        {"\n"}{"\n"}
                        With Link Munch Merchant you’re able to control your online orders and manage your online menu instantly with live menu updates.  Launch unlimited influencer marketing campaigns by creating and posting a restaurant promotion on the Link Munch mobile app.
                        {"\n"}{"\n"}
                        Link Munch Users, customers, can order directly from your restaurant and purchase your restaurant promotion.  Additionally, Link Munch Users can earn rewards by sharing your restaurant promotions on social media.
                        {"\n"}{"\n"}
                        We collect your data to make the platform work and or to improve it. We don’t share your data without your consent.
                        {"\n"}{"\n"}
                        Please check Link Munch Private Policy for more details or contact us at <Text style={{}}>support@linkmunch.com</Text>.
                    </Text>
                </View>
            </SafeAreaView>
            <View style={{ flex: 1 }}>
                <View style={style.checkBoxContainer}>
                    <CheckBox
                        containerStyle={style.checkBoxStyle}
                        checked={checkedTermsAndPrivacy}
                        onPress={() => setCheckedTermsAndPrivacy(!checkedTermsAndPrivacy)}
                        checkedColor="#D65344"
                    />
                    <Text style={style.checkBoxText}>
                        I've read and agree to LinkMunch's
                        <Text
                            onPress={() => Linking.openURL('https://linkmunch.com/termsofuse/')}
                            style={style.openURLButton}
                        >
                            {" "}Terms of Use{" "}
                        </Text>
                        and
                        <Text
                            onPress={() => Linking.openURL('https://linkmunch.com/privacypolicy/')}
                            style={style.openURLButton}
                        >
                            {" "}Privacy{" "}
                        </Text>
                        policies.
                    </Text>
                </View>
            </View>
            <View style={{ flex: 2 }}>
                <Button
                    buttonStyle={style.buttonStyle}
                    title="Join Now"
                    disabled={!checkedTermsAndPrivacy && !loading}
                    disabledStyle={[style.buttonStyle, { opacity: 0.8 }]}
                    onPress={() => {
                        initializePaymentSheet().then(openPaymentSheet())
                    }}
                >
                </Button>
                <Text style={style.disclaimer}>
                    Free 30 day trial does not include promotional sales. After trial, $19.99 monthly subscription billed every 30 days. A 30% commission is applied for each promotion sold.
                </Text>
            </View>
        </View>
    );
}


const style = StyleSheet.create({
    container: {
        display: 'flex',
        flexDirection: 'column',
        width: '90%',
        height: '80%',
        justifyContent: 'center',
        margin: 'auto',
        left: '5%',
        marginTop: '20%'
    },
    inputStyle: {
        flex: 1,
        marginTop: 5,
        borderRadius: 5,
        borderColor: '#888',
        borderWidth: 1,
        paddingLeft: 15
    },
    buttonStyle: {
        backgroundColor: '#D65344',
        paddingTop: 15,
        paddingBottom: 15,
        marginTop: 30,
    },
    safeViewContainer: {
        height: "80%",
        flex: 8,
        alignItems: 'stretch',
        justifyContent: 'flex-start',
        marginTop: '5%'
    },
    scrollView: {
        alignContent: 'center'
    },
    scrollViewText: {
        fontSize: RFValue(10.5, 580),
        paddingBottom: 3,
        paddingTop: 10
    },
    text: {
        fontSize: 14,
    },
    openURLButton: {
        fontWeight: "600"
    },
    openURLButtonTitle: {
        fontSize: 15,
        color: "#D65344",
        fontWeight: "600"
    },
    checkBoxView: {
        flex: 1,
        paddingTop: 15
    },
    checkBoxContainer: {
        display: 'flex',
        flexDirection: 'row',
        padding: 0,
        margin: 0,
        alignItems: "center",
        width: '90%'
    },
    checkBoxStyle: {
        padding: 0,
        margin: 0
    },
    checkBoxText: {
        textAlignVertical: 'center',
        flexWrap: 'wrap'
    },
    logo: {
        flex: 2,
        alignSelf: 'center',
        maxHeight: '100%',
        maxWidth: '80%'
    },
})