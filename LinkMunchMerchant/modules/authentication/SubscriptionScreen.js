import React, { useState, useEffect, useCallback } from 'react'
import { Text, Input, Button, CheckBox } from 'react-native-elements'
import { View, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Alert, Linking, Image, ActivityIndicator } from 'react-native'
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen'
import { RFValue } from 'react-native-responsive-fontsize'
import { useStripe } from '@stripe/stripe-react-native';
import { createStackNavigator } from '@react-navigation/stack';



export default function SubscriptionScreen() {
    const { initPaymentSheet, presentPaymentSheet } = useStripe();
    const [loading, setLoading] = useState(false);

    const fetchPaymentSheetParams = async () => {
        const response = await fetch(`https://9yl3ar8isd.execute-api.us-west-1.amazonaws.com/beta/payment-sheet`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        const { paymentIntent, ephemeralKey, customer } = await response.json();

        return {
            paymentIntent,
            ephemeralKey,
            customer,
        };
    };

    const initializePaymentSheet = async () => {
        const {
            paymentIntent,
            ephemeralKey,
            customer,
            // publishableKey,
        } = await fetchPaymentSheetParams();

        const { error } = await initPaymentSheet({
            merchantDisplayName: "Example, Inc.",
            customerId: customer,
            customerEphemeralKeySecret: ephemeralKey,
            paymentIntentClientSecret: paymentIntent,
            // Set `allowsDelayedPaymentMethods` to true if your business can handle payment
            //methods that complete payment after a delay, like SEPA Debit and Sofort.
            allowsDelayedPaymentMethods: true,
            defaultBillingDetails: {
                name: 'Jane Doe',
            }
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
            Alert.alert('Success', 'Your order is confirmed!');
        }
    };

    useEffect(() => {
        initializePaymentSheet();
    }, []);
}

const style = StyleSheet.create({
    container: {
        width: '90%',
        height: '90%',
        margin: '5%',
        justifyContent: 'center'
    },
    buttonStyle: {
        marginTop: 30,
    },
    text: {
        fontSize: 30,
        textAlign: 'center'
    },
    disclaimer: {
        marginTop: 30,
        fontSize: 10
    }
})